# EV Pulse Benchmark v0.9.6 — Transparent EV6 + Supabase Strict

Denne version bygger direkte oven på v0.9.5. Projektet er klar til upload i roden af Git-repositoryet.

## Rettelser

- **Rigtigt transparent bil-asset:** `assets/vehicles/front/ev6-front-transparent.png` er et fritlagt 956 × 488 RGBA-billede fra den eksisterende højopløste reference. CSS bruger kun placering og kontaktskygge: ingen foto-baggrund, gradientmaske eller rektangulær beskæring. Den oprindelige store hero-bil bagfra er bevaret.
- **Sidebar:** Nyt skalerbart SVG-logo med tre linjer og puls-signal. Navigation/sidebar følger referenceproportionerne (~92 px ved 1120 px og 148 px på store desktopskærme).
- **Fabriksspecifikationer:** Modelår før 2025 tvinger oprindelig generation. EV6 Long Range 2023 = **77,4 kWh**, selv hvis en gammel Supabase-post fejlagtigt indeholder 84,0. Nominalt batteri bruges kun som fabriksreference; det er ikke en måling af aktuel brugbar energi.
- **Rettelse af gammel databasepost:** Visningen overskriver ikke Supabase automatisk. Under **Min bil** vises en advarsel ved modstridende historisk kapacitet. Klik **Gem bilprofil** for at opdatere den eksisterende post. Flådesammenligning deaktiveres, indtil profilen stemmer.
- **Kun Supabase-data:** Bilprofiler hentes fra `vehicles` for den indloggede bruger, og batterimålinger læses fra `battery_records` for den bil. Ingen fiktive målinger, demo-tilstand, medfølgende test-CSV eller simuleret flådefordeling. En tom database giver `—`/"Ingen målinger". Ved forbindelsesfejl tømmes visningen.
- **CSV-import** forbliver som en tilsigtet brugerhandling, men målingerne læses først tilbage fra Supabase efter upload. Kildekolonnen viser CSV, OBD eller Ukendt baseret på metadata, ikke en opdigtet målekilde.
- **Cellebalancens farveskala** grøn → gul → orange → rød er bevaret. Skalaen er illustrativ, ikke diagnostisk.

## Vigtig afgrænsning

Frontbilen er en **mørkegrå visuel reference**, ikke et verificeret fabriksfoto i hver valgt lakfarve. Det er et ægte transparent PNG-asset, men bilens faktiske udstyrsvariant/farve skal fortsat verificeres mod en bedre kilde, hvis der senere ønskes variantpræcise fotos.

**Allerede importerede testposter i Supabase slettes ikke af denne kodeversion.** Det er ikke muligt at skelne pålideligt mellem testposter og reelle CSV-importer, hvis de er gemt med samme kildemetadata. Gennemgå dem i Supabase, før der eventuelt slettes noget. Vi sletter ikke brugerdata automatisk.

## Installation

1. Opret gerne en Git-branch eller tag af den eksisterende version.
2. Pak ZIP'en ud i repositoryets rod og overskriv de eksisterende filer; `.git` bevares.
3. Commit, push, og opdater siden med Ctrl+F5.
4. Åbn **Min bil** og tryk **Gem bilprofil**, hvis der vises advarsel om en forkert gammel fabriksbatteriværdi.

## Kontrol

- `node --check app.js` bestået.
- Browser-scenarier: 1120 px, 1792 px, 390 px; ingen JavaScript-fejl eller vandret overflow.
- Isolerede Supabase-testresponser: tomme målinger (ingen værdier), målinger (præcis returdata), 2023 + gammel 84-kWh-profil (77,4-kWh fabriksreference).
- Ikke live-testet mod din produktions-Supabase eller deployment. Browserprøverne brugte midlertidige testsvar **uden for ZIP-filen**.
