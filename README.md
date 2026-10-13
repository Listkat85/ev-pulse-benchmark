# EV Pulse Benchmark v0.1

Første fungerende MVP af EV Pulse Benchmark.

## Hvad v0.1 kan
- Opretter en anonym Supabase-session i browseren.
- Opretter/redigerer én EV-bilprofil.
- Importerer præcis det Battery Evidence CSV-format, som EV Pulse v4 eksporterer.
- Mapper CSV-records til `battery_records`.
- Deduplikerer imports via `client_record_id`.
- Viser:
  - seneste SoH
  - seneste Remaining Energy ved `FULL_CHARGE_REFERENCE`
  - seneste spændingsspredning
  - antal Battery Evidence-records
  - SoH-tidslinje over kilometer
  - seneste evidens-events
- Ingen VIN, nummerplade eller position uploades.

## 1. Kør permissions SQL
I Supabase → SQL Editor, kør:
`sql/03_permissions.sql`

Det er nødvendigt, fordi RLS-politikker og Data API permissions er to forskellige lag.

## 2. Kontroller Anonymous Sign-ins
Supabase → Authentication → Providers / Sign-in methods → Anonymous:
Enabled.

## 3. Test lokalt eller deploy på Vercel
Projektet kræver ingen npm/build.

Den letteste vej:
1. Opret et privat GitHub repository, fx `ev-pulse-benchmark`.
2. Upload alle filer fra denne mappe til repository-roden.
3. Vercel → Add New Project → Import Git Repository.
4. Framework Preset: `Other`.
5. Build command: tom.
6. Output directory: tom / default.
7. Deploy.

## 4. Første brug
1. Åbn siden.
2. Bilprofilen er forudfyldt som Kia EV6 / 2023 / RWD / 77,4 kWh.
3. Gem bilprofil.
4. EV Pulse → Mere → Batterihistorik → Eksportér CSV.
5. Dashboard → Upload data → vælg CSV → Forhåndsvis → Upload.
6. Gå tilbage til Overblik.

## Benchmark mod andre biler
Rådata fra andre brugere skal ikke eksponeres gennem klient-RLS.
`sql/04_benchmark_rpc.sql` indeholder et første sikkert aggregate-RPC-design:
- verificerer ejerskab af din bil
- finder sammenlignelige biler
- returnerer kun aggregeret SoH
- viser ingen benchmark-statistik før mindst 5 biler findes

Det er bevidst ikke koblet til UI'et endnu. Først validerer vi import og din egen Battery Evidence.

## Supabase config
`config.js` indeholder kun Project URL + publishable key.
Publishable key er beregnet til klientbrug. Service role / secret key må aldrig lægges i dette repo eller frontend.

## Privatliv
MVP'en gemmer en anonym auth-session i browserens storage. Hvis browserdata ryddes, kan den anonyme session mistes.
Senere bør vi tilbyde account linking/login, hvis en bruger vil kunne tilgå samme bil fra flere enheder.
