-- EV Pulse 1.0: real-peers-only aggregate with technical model match via catalogue.
-- Run AFTER 07_vehicle_catalog_v1.sql and existing 06_peer_benchmark_v09.sql.
-- Existing profiles without a catalogue key remain visible to owner, but are
-- excluded from fleet comparisons until their technical identity is confirmed.
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
    v_owner uuid;
    v_catalog text;
    v_year integer;
    v_target_odo numeric;
    v_target_soh numeric;
BEGIN
    IF p_km_window IS NULL OR p_km_window NOT BETWEEN 1000 AND 50000 THEN
       RAISE EXCEPTION 'invalid km window';
    END IF;
    SELECT owner_user_id,catalog_variant_key,model_year
    INTO v_owner,v_catalog,v_year FROM public.vehicles WHERE id=p_vehicle_id;
    IF v_owner IS NULL OR v_owner <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
    IF v_catalog IS NULL THEN
      RETURN QUERY SELECT 0::bigint,NULL::numeric,NULL::numeric,NULL::numeric,NULL::numeric,NULL::numeric;
      RETURN;
    END IF;
    SELECT br.odometer_km,br.soh_percent INTO v_target_odo,v_target_soh
      FROM public.battery_records br WHERE br.vehicle_id=p_vehicle_id
      AND br.soh_percent BETWEEN 1 AND 100 AND br.odometer_km IS NOT NULL
      ORDER BY br.recorded_at DESC LIMIT 1;
    IF v_target_odo IS NULL OR v_target_soh IS NULL THEN
      RETURN QUERY SELECT 0::bigint,NULL::numeric,NULL::numeric,NULL::numeric,NULL::numeric,NULL::numeric;
      RETURN;
    END IF;
    RETURN QUERY WITH latest_peer AS (
      SELECT DISTINCT ON (br.vehicle_id) br.vehicle_id,br.soh_percent::numeric AS soh
      FROM public.battery_records br
      JOIN public.vehicles v ON v.id=br.vehicle_id
      JOIN public.ev_vehicle_catalog peer ON peer.variant_key=v.catalog_variant_key
      JOIN public.ev_vehicle_catalog target ON target.variant_key=v_catalog
      WHERE v.id<>p_vehicle_id AND v.owner_user_id<>v_owner
        AND peer.manufacturer=target.manufacturer AND peer.model=target.model
        AND peer.generation=target.generation AND peer.pack=target.pack AND peer.drive=target.drive
        AND v.model_year BETWEEN v_year-2 AND v_year+2
        AND br.soh_percent BETWEEN 1 AND 100
        AND br.odometer_km BETWEEN v_target_odo-p_km_window AND v_target_odo+p_km_window
      ORDER BY br.vehicle_id,br.recorded_at DESC
    ), stats AS (
      SELECT COUNT(*)::bigint n,
        percentile_cont(.5) WITHIN GROUP (ORDER BY soh)::numeric med,
        percentile_cont(.25) WITHIN GROUP (ORDER BY soh)::numeric p25,
        percentile_cont(.75) WITHIN GROUP (ORDER BY soh)::numeric p75,
        (100.0 * COUNT(*) FILTER (WHERE soh <= v_target_soh) / NULLIF(COUNT(*),0))::numeric pct
      FROM latest_peer
    )
    SELECT s.n,v_target_soh,
      CASE WHEN s.n>=5 THEN s.med ELSE NULL END,
      CASE WHEN s.n>=5 THEN s.p25 ELSE NULL END,
      CASE WHEN s.n>=5 THEN s.p75 ELSE NULL END,
      CASE WHEN s.n>=5 THEN s.pct ELSE NULL END
    FROM stats s;
END;
$$;
REVOKE ALL ON FUNCTION public.get_soh_benchmark(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_soh_benchmark(uuid,integer) TO authenticated;
