-- EV PULSE BENCHMARK · SAFE AGGREGATE RPC v0.1
-- Valgfri nu; nyttig når der er mindst 5 biler.
-- Returnerer kun aggregerede SoH-tal og verificerer, at caller ejer target-bilen.

create or replace function public.get_soh_benchmark(
    p_vehicle_id uuid,
    p_km_window integer default 25000
)
returns table (
    sample_size bigint,
    target_soh numeric,
    median_soh numeric,
    p25_soh numeric,
    p75_soh numeric,
    percentile numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner uuid;
    v_model text;
    v_manufacturer text;
    v_battery numeric;
    v_target_odo numeric;
    v_target_soh numeric;
begin
    select owner_user_id, manufacturer, model, battery_nominal_kwh
    into v_owner, v_manufacturer, v_model, v_battery
    from public.vehicles
    where id = p_vehicle_id;

    if v_owner is null or v_owner <> auth.uid() then
        raise exception 'not authorized';
    end if;

    select br.odometer_km, br.soh_percent
    into v_target_odo, v_target_soh
    from public.battery_records br
    where br.vehicle_id = p_vehicle_id
      and br.soh_percent is not null
      and br.soh_percent > 0
      and br.odometer_km is not null
    order by br.recorded_at desc
    limit 1;

    if v_target_odo is null or v_target_soh is null then
        return query select 0::bigint, null::numeric, null::numeric, null::numeric, null::numeric, null::numeric;
        return;
    end if;

    return query
    with latest_per_vehicle as (
        select distinct on (br.vehicle_id)
            br.vehicle_id,
            br.soh_percent,
            br.odometer_km
        from public.battery_records br
        join public.vehicles v on v.id = br.vehicle_id
        where v.manufacturer = v_manufacturer
          and v.model = v_model
          and (v_battery is null or v.battery_nominal_kwh = v_battery)
          and br.soh_percent is not null
          and br.soh_percent > 0
          and br.odometer_km between (v_target_odo - p_km_window) and (v_target_odo + p_km_window)
        order by br.vehicle_id, br.recorded_at desc
    ),
    stats as (
        select
            count(*)::bigint as n,
            percentile_cont(0.5) within group (order by soh_percent)::numeric as med,
            percentile_cont(0.25) within group (order by soh_percent)::numeric as p25,
            percentile_cont(0.75) within group (order by soh_percent)::numeric as p75,
            (100.0 * sum(case when soh_percent <= v_target_soh then 1 else 0 end) / nullif(count(*),0))::numeric as pct
        from latest_per_vehicle
    )
    select
        s.n,
        v_target_soh,
        case when s.n >= 5 then s.med else null end,
        case when s.n >= 5 then s.p25 else null end,
        case when s.n >= 5 then s.p75 else null end,
        case when s.n >= 5 then s.pct else null end
    from stats s;
end;
$$;

revoke all on function public.get_soh_benchmark(uuid, integer) from public, anon;
grant execute on function public.get_soh_benchmark(uuid, integer) to authenticated;
