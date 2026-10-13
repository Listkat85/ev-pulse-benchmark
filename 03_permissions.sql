-- EV PULSE BENCHMARK · API PERMISSIONS v1
-- Kør denne én gang i Supabase SQL Editor.
-- RLS-politikkerne beskytter stadig rækkerne.

grant usage on schema public to authenticated;

grant select, insert, update, delete
on table public.vehicles
to authenticated;

grant select, insert
on table public.battery_records
to authenticated;

grant select, insert
on table public.trip_summaries
to authenticated;

grant select, insert
on table public.charge_summaries
to authenticated;
