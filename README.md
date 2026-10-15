# EV Pulse Benchmark v0.9.8 – Fix af modelskift og frontbil

## Rettet fejl fra v0.9.7

Når brugeren tidligere ændrede **Modelår** fra 2023 til 2025, beholdt formularen ofte **Oprindelig generation** og gemte 77,4 kWh. Da frontbilledet vælges efter generationen ud fra den gemte batterikapacitet, skiftede det derfor aldrig til facelift.

I v0.9.8:

1. Valg af modelår **2025 eller nyere** foreslår **Facelift** og korrekt fabriksbatteri automatisk. Før 2025 låses til oprindelig generation.
2. Brugeren kan fortsat vælge **Oprindelig** manuelt ved et modelår fra 2025 og frem (tidligt indregistrerede biler).
3. Der er nu en særskilt, direkte opdateret **frontbil-preview på siden Min bil**, som viser billedet og kWh-værdien, allerede *før* der gemmes.
4. Når **Gem bilprofil** lykkes i Supabase, genindlæses dashboardets frontbillede ud fra det gemte køretøj. Frontbilledet på forsiden viser ikke kladdemodellen før lagringen.
5. Scripts og nyt stylesheet har versionsmærke for at mindske cachefejl på GitHub Pages/Vercel.

## Kontrol

- 2023 Long Range RWD -> oprindelig EV6, 77,4 kWh.
- Skift til 2025 Long Range RWD -> facelift forvalgt, 84,0 kWh.
- 2025 med eksplicit valgt oprindelig generation -> original EV6, 77,4 kWh.
- 2025 Standard Range facelift -> 63,0 kWh.
- Ingen fiktive måledata; Supabase-behandling og CSV-import er ikke ændret.
- To transparente PNG-aktiver følger med i `assets/vehicles/front`.

## Sådan opdaterer du

Pak ZIP-filen ud oven på repoets rodmappe, commit og push. Åbn **Min bil**, vælg modelår 2025 og kontrollér at frontvisningen skifter til facelift. Klik **Gem bilprofil** og kontrollér derefter, at forsiden viser den nye bil. Hvis browseren stadig cacher gammel HTML, brug Ctrl+F5.

Ingen ny SQL-migration. En eksisterende **2025**-profil med **77,4 kWh** behandles fortsat som oprindelig generation, indtil du eksplicit skifter til facelift og gemmer, for at undgå at ændre en legitim ældre 2025-registrering.

Alle andre funktioner fra v0.9.7 bevares. Live-Supabase skal testes i produktionsmiljøet.
