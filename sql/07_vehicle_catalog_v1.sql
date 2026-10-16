-- EV Pulse v1.0: authoritative and extendable vehicle catalogue (DK variants).
-- Run once in Supabase SQL Editor BEFORE deploying v1.0 code.
-- No historic vehicles or battery_records are deleted or backfilled.
-- Catalogue entries must be sourced before adding additional makes/models/years.
CREATE TABLE IF NOT EXISTS public.ev_vehicle_catalog (
  variant_key text PRIMARY KEY,
  manufacturer text NOT NULL,
  model text NOT NULL,
  generation text NOT NULL,
  pack text NOT NULL,
  drive text NOT NULL,
  trim_level text NOT NULL,
  battery_nominal_kwh numeric(6,1) NOT NULL CHECK (battery_nominal_kwh > 0),
  platform text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ev_vehicle_catalog_years (
  variant_key text NOT NULL REFERENCES public.ev_vehicle_catalog(variant_key),
  model_year integer NOT NULL CHECK (model_year BETWEEN 2000 AND 2100),
  PRIMARY KEY (variant_key,model_year)
);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS catalog_variant_key text;
DO $$ BEGIN
  ALTER TABLE public.vehicles ADD CONSTRAINT ev_vehicles_catalog_variant_fk
    FOREIGN KEY (catalog_variant_key) REFERENCES public.ev_vehicle_catalog(variant_key);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Viewable by signed-in anonymous/authenticated clients, immutable through the public API.
ALTER TABLE public.ev_vehicle_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ev_vehicle_catalog_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ev_catalog_read ON public.ev_vehicle_catalog;
CREATE POLICY ev_catalog_read ON public.ev_vehicle_catalog FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ev_catalog_years_read ON public.ev_vehicle_catalog_years;
CREATE POLICY ev_catalog_years_read ON public.ev_vehicle_catalog_years FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.ev_vehicle_catalog,public.ev_vehicle_catalog_years TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.ev_vehicle_catalog,public.ev_vehicle_catalog_years FROM anon,authenticated;
-- Sourced values: original EV6 58/77.4 kWh (Kia Denmark 2021), facelift 62.9/84 kWh (Kia DK).

INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-original-standard-rwd-standard','Kia','EV6','original','standard','RWD','Standard',58,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-standard',2021) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-standard',2022) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-standard',2023) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-standard',2024) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-standard',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-original-long-rwd-standard','Kia','EV6','original','long','RWD','Standard',77.4,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-standard',2021) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-standard',2022) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-standard',2023) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-standard',2024) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-standard',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-original-long-awd-standard','Kia','EV6','original','long','AWD','Standard',77.4,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-standard',2021) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-standard',2022) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-standard',2023) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-standard',2024) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-standard',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-original-standard-rwd-gtline','Kia','EV6','original','standard','RWD','GT-Line',58,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-gtline',2021) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-gtline',2022) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-gtline',2023) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-gtline',2024) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-standard-rwd-gtline',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-original-long-rwd-gtline','Kia','EV6','original','long','RWD','GT-Line',77.4,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-gtline',2021) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-gtline',2022) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-gtline',2023) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-gtline',2024) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-rwd-gtline',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-original-long-awd-gtline','Kia','EV6','original','long','AWD','GT-Line',77.4,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-gtline',2021) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-gtline',2022) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-gtline',2023) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-gtline',2024) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-gtline',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-original-long-awd-gt','Kia','EV6','original','long','AWD','GT Performance',77.4,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-gt',2023) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-gt',2024) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-original-long-awd-gt',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-facelift-standard-rwd-standard','Kia','EV6','facelift','standard','RWD','Standard',62.9,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-standard-rwd-standard',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-standard-rwd-standard',2026) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-facelift-long-rwd-standard','Kia','EV6','facelift','long','RWD','Standard',84,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-long-rwd-standard',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-long-rwd-standard',2026) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-facelift-long-awd-standard','Kia','EV6','facelift','long','AWD','Standard',84,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-long-awd-standard',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-long-awd-standard',2026) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-facelift-long-rwd-gtline','Kia','EV6','facelift','long','RWD','GT-Line',84,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-long-rwd-gtline',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-long-rwd-gtline',2026) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog (variant_key,manufacturer,model,generation,pack,drive,trim_level,battery_nominal_kwh,platform) VALUES ('kia-ev6-facelift-long-awd-gtline','Kia','EV6','facelift','long','AWD','GT-Line',84,'E-GMP') ON CONFLICT (variant_key) DO UPDATE SET manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,generation=EXCLUDED.generation,pack=EXCLUDED.pack,drive=EXCLUDED.drive,trim_level=EXCLUDED.trim_level,battery_nominal_kwh=EXCLUDED.battery_nominal_kwh,platform=EXCLUDED.platform;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-long-awd-gtline',2025) ON CONFLICT DO NOTHING;
INSERT INTO public.ev_vehicle_catalog_years (variant_key,model_year) VALUES ('kia-ev6-facelift-long-awd-gtline',2026) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.ev_enforce_vehicle_catalog()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE spec public.ev_vehicle_catalog%ROWTYPE;
BEGIN
  -- Keep untouched legacy profiles readable. As soon as a vehicle's technical
  -- identity is created/changed, catalogue identification is mandatory.
  IF TG_OP='UPDATE' AND NEW.catalog_variant_key IS NOT DISTINCT FROM OLD.catalog_variant_key
    AND NEW.manufacturer IS NOT DISTINCT FROM OLD.manufacturer
    AND NEW.model IS NOT DISTINCT FROM OLD.model
    AND NEW.model_year IS NOT DISTINCT FROM OLD.model_year
    AND NEW.variant IS NOT DISTINCT FROM OLD.variant
    AND NEW.trim_level IS NOT DISTINCT FROM OLD.trim_level
    AND NEW.battery_nominal_kwh IS NOT DISTINCT FROM OLD.battery_nominal_kwh
    AND NEW.platform IS NOT DISTINCT FROM OLD.platform THEN
    RETURN NEW;
  END IF;
  IF NEW.catalog_variant_key IS NULL OR trim(NEW.catalog_variant_key)='' THEN
    RAISE EXCEPTION 'Vælg en variant i det godkendte bilkatalog (catalog_variant_key).';
  END IF;
  SELECT * INTO spec FROM public.ev_vehicle_catalog WHERE variant_key=NEW.catalog_variant_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ukendt bilvariant: %',NEW.catalog_variant_key; END IF;
  IF NEW.manufacturer IS DISTINCT FROM spec.manufacturer OR NEW.model IS DISTINCT FROM spec.model
    OR NEW.variant IS DISTINCT FROM spec.drive OR NEW.trim_level IS DISTINCT FROM spec.trim_level
    OR NEW.platform IS DISTINCT FROM spec.platform OR NEW.battery_nominal_kwh IS DISTINCT FROM spec.battery_nominal_kwh
    OR NOT EXISTS (SELECT 1 FROM public.ev_vehicle_catalog_years y
      WHERE y.variant_key=spec.variant_key AND y.model_year=NEW.model_year) THEN
    RAISE EXCEPTION 'Bilens årgang og tekniske specifikationer skal stemme med godkendt bilkatalog.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ev_vehicles_catalog_guard ON public.vehicles;
CREATE TRIGGER ev_vehicles_catalog_guard
  BEFORE INSERT OR UPDATE OF catalog_variant_key,manufacturer,model,model_year,variant,trim_level,battery_nominal_kwh,platform
  ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.ev_enforce_vehicle_catalog();
REVOKE ALL ON FUNCTION public.ev_enforce_vehicle_catalog() FROM PUBLIC;
-- RLS for vehicles and records must already exist in the existing project.
-- Existing battery_records keep the same vehicle_id: NO data migration or loss.
