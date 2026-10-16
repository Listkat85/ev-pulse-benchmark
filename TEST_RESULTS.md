# EV Pulse 1.0 – QA-resultater

- **Analysemotor – reelle importrecords:** 351 records, 30 dage, 100,0 % → 97,5 % BMS SoH, SoC-bands 7/10/9/12/12 måledage, fire unikke SoH-trin.
- **Dataintegritet:** analyser ved manglende data returnerer 'Ingen data'. Screening indeholder ikke falske DTC'er. En testfixture med eksplicit DTC, REST_CHANGE og forhøjet cellespænding bliver markeret og tæller separate dage.
- **Variantmatrix:** 2023 original LR RWD = 77,4 kWh, 2025 facelift LR RWD = 84,0 kWh, 2025 original LR RWD = 77,4 kWh, 2026 facelift SR RWD = 62,9 kWh, ugyldige generation-/årgangskombinationer filtreres fra.
- **UI-browser:** isoleret Chromium/Playwright med 351 faktiske records som mockede Supabase-svar. `Forbundet`, original 2023 valgt ved start; årgang 2025 nulstiller generation og deaktiverer Gem; efter eksplicit facelift-valg får man 84,0 kWh og gyldig katalog-ID; simuleret gemning opdaterer forsiden og frontbils-generationen; printvenlig rapport dannes; mobilviewport 390 px viser alle Condition-paneler uden dokument-overflow.
- **JS:** alle tre scripts passerer Node `--check`.
- **Ikke testet:** faktisk PostgreSQL-migration i brugerens Supabase, Vercel production deploy eller biler fra andre producenter. Rigtig backendvalidering skal kontrolleres på Supabase efter SQL 07/08.
- **Kilder:** Kia Danmark EV6 pressemeddelelse (2021) og Kia Danmark EV6 modelside for opdaterede batterier.
