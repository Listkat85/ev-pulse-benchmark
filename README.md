# EV Pulse Benchmark v0.8 · Min bil

Den komplette version til GitHub Desktop. **Må ikke blandes med ældre versioner**.

## Ændret
- Bilen konfigureres nu **kun under Min bil** (ikke på forsiden).
- Varianter: **EV6 Standard**, **GT-Line** og **GT (Performance)**.
- Drivlinje (RWD/AWD), batteristørrelse og modelår er separate oplysninger.
- Farven vælges med de fem Kia-farveprøver inde på Min bil.
- Der er en billedvisning med live lokal forhåndsvisning af variant og farve.
- Tryk **Gem bilprofil** for at gemme valget i Supabase, så forsiden bruger den gemte bil.
- GT (Performance) vælger AWD, og en inkonsistent RWD-GT kan ikke gemmes.
- De eksisterende 10 billeder for GT-Line/GT og resten af Supabase/CSV-logikken er bevaret.

## Standard-billedet — vigtigt
Den tidligere pakke havde **ikke billeder af basisudgaven**. Vi opfinder ikke en Standard-karrosserivariant:
Indtil 5 særskilte EV6 Standard-billeder tilføjes under `assets/heroes/standard/`,
viser Standard-valget et **tydeligt markeret GT-Line-referencemotiv**. Standard er en gyldig
bilprofil og gemmes som `trim_level = 'Standard'`, men motivet er ikke en eksakt Standard-fotogengivelse.

Fremtidige Standard-filer navngives fx:
- `assets/heroes/standard/hero_standard_klm_moonscape.png`
- `assets/heroes/standard/hero_standard_swp_snow-white-pearl.png`
- `assets/heroes/standard/hero_standard_abp_aurora-black-pearl.png`
- `assets/heroes/standard/hero_standard_du3_yacht-blue.png`
- `assets/heroes/standard/hero_standard_cr5_runway-red.png`

Når de tilføjes, finder samme kode dem automatisk.

## Database
**Ingen ny SQL nødvendig**. Bruger `trim_level`, `exterior_color_code`,
`exterior_color_name` fra den eksisterende v0.5 migration.

## Installation
1. Pak ZIP'en ud.
2. Kopiér filerne ind i dit klonede `ev-pulse-benchmark`-repo med GitHub Desktop.
3. Fjern gamle, løse hero-billeder i roden, behold kun det strukturerede `assets/heroes`.
4. Commit (`EV Pulse Benchmark v0.8 - Min bil`) og **Push origin**.
5. Vercel redeployer automatisk.
