-- EV Pulse Benchmark v0.5
-- Vehicle visual configuration: trim + exterior paint.

alter table public.vehicles
  add column if not exists trim_level text,
  add column if not exists exterior_color_code text,
  add column if not exists exterior_color_name text;

update public.vehicles
set
  trim_level = coalesce(trim_level, 'GT-Line'),
  exterior_color_code = coalesce(exterior_color_code, 'KLM'),
  exterior_color_name = coalesce(exterior_color_name, 'Moonscape');

create index if not exists idx_vehicles_trim
  on public.vehicles(manufacturer, model, trim_level);

create index if not exists idx_vehicles_color
  on public.vehicles(manufacturer, model, exterior_color_code);
