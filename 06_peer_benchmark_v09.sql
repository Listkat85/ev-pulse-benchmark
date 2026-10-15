-- EV Pulse Benchmark v0.9 · Match comparable vehicles without revealing private data.
-- Apply AFTER existing schema and sql/04_benchmark_rpc.sql.
-- At least five OTHER vehicles are required; excludes the user's own vehicle from peers.
CREATE OR REPLACE FUNCTION public.get_soh_benchmark(
    p_vehicle_id uuid,
    p_km_window integer DEFAULT 25000
)
RETURNS TABLE (
    sample_size bigint,
    target_soh numeric,
    median_soh numeric,
    p25_soh numeric,
    p75_soh numeric,
    percentile numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner uuid;
    v_model text;
    v_manufacturer text;
    v_battery numeric;
    v_variant text;
    v_year integer;
    v_target_odo numeric;
    v_target_soh numeric;
BEGIN
    IF p_km_window IS NULL OR p_km_window NOT BETWEEN 1000 AND 50000 THEN
        RAISE EXCEPTION 'invalid km window';
    END IF;

    SELECT owner_user_id, manufacturer, model, battery_nominal_kwh, variant, model_year
    INTO v_owner, v_manufacturer, v_model, v_battery, v_variant, v_year
    FROM public.vehicles
    WHERE id = p_vehicle_id;

    IF v_owner IS NULL OR v_owner <> auth.uid() THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    SELECT br.odometer_km, br.soh_percent
    INTO v_target_odo, v_target_soh
    FROM public.battery_records br
    WHERE br.vehicle_id = p_vehicle_id
      AND br.soh_percent BETWEEN 1 AND 100
      AND br.odometer_km IS NOT NULL
    ORDER BY br.recorded_at DESC
    LIMIT 1;

    IF v_target_odo IS NULL OR v_target_soh IS NULL THEN
        RETURN QUERY SELECT 0::bigint, NULL::numeric,NULL::numeric,NULL::numeric,NULL::numeric,NULL::numeric;
        RETURN;
    END IF;

    RETURN QUERY
    WITH latest_peer AS (
        SELECT DISTINCT ON (br.vehicle_id)
            br.vehicle_id,
            br.soh_percent::numeric AS soh_percent
        FROM public.battery_records br
        JOIN public.vehicles v ON v.id = br.vehicle_id
        WHERE v.id <> p_vehicle_id
          AND v.manufacturer = v_manufacturer
          AND v.model = v_model
          AND v.battery_nominal_kwh = v_battery
          AND v.variant = v_variant
          AND (v_year IS NULL OR v.model_year BETWEEN v_year - 2 AND v_year + 2)
          AND br.soh_percent BETWEEN 1 AND 100
          AND br.odometer_km BETWEEN v_target_odo - p_km_window AND v_target_odo + p_km_window
        ORDER BY br.vehicle_id, br.recorded_at DESC
    ), stats AS (
        SELECT COUNT(*)::bigint AS n,
               percentile_cont(.5) WITHIN GROUP (ORDER BY soh_percent)::numeric AS med,
               percentile_cont(.25) WITHIN GROUP (ORDER BY soh_percent)::numeric AS p25,
               percentile_cont(.75) WITHIN GROUP (ORDER BY soh_percent)::numeric AS p75,
               (100.0 * COUNT(*) FILTER (WHERE soh_percent <= v_target_soh) / NULLIF(COUNT(*),0))::numeric AS pct
        FROM latest_peer
    )
    SELECT s.n, v_target_soh,
           CASE WHEN s.n >= 5 THEN s.med ELSE NULL END,
           CASE WHEN s.n >= 5 THEN s.p25 ELSE NULL END,
           CASE WHEN s.n >= 5 THEN s.p75 ELSE NULL END,
           CASE WHEN s.n >= 5 THEN s.pct ELSE NULL END
    FROM stats s;
END;
$$;

REVOKE ALL ON FUNCTION public.get_soh_benchmark(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_soh_benchmark(uuid, integer) TO authenticated;
