# EV Pulse Benchmark v1.1.0 – Internal / External / Combined

**Opdatering oven på den fungerende v1.0.0.** Ændrer ingen Supabase-tabeller og kræver **ingen nye SQL-migrationer**, når SQL 07 og 08 allerede er kørt.

## Opgradering

1. Pak ZIP-filen ud i roden af samme Git-repository og erstat filerne. **Behold alle eksisterende assets og `config.js`.**
2. Push til GitHub og vent på Vercel-deployment.
3. Genindlæs siden med Ctrl+F5. Åbn **Sammenligning** i venstremenuen. Siden indeholder tre faner: **Samlet overblik**, **Intern flåde**, **Ekstern forskning**.
4. Kontroller, at de 351 eksisterende poster fortsat vises. **Kør ikke SQL 07/08 igen** for denne opdatering, hvis de allerede er gennemført.

## Vigtig dataintegritet

- **Intern flåde:** præcis den eksisterende `get_soh_benchmark`-RPC i Supabase; mindst **5 andre** teknisk sammenlignelige biler, én SoH pr. bil. Egen bil er ikke med i flådetallet. Ingen demo- eller eksterne tal i percentiler.
- **Ekstern forskning:** kildehenviste, **manuelt kontrollerede offentlige referencefakta** gemt i `benchmark-hub.js`. Ingen scraping, baggrundsopdatering, import eller deling af brugerens egne data med tredjeparter. Ingen nye databaseposter. EV6-resultat 95,95 % fra Carla/AVILOO >100.000 km holdes adskilt fra BMS SoH.
- **Samlet overblik:** vises på samme side, men **ingen blandet median, sundhedsscore eller samlet rangering**.
- **Offentlige forumeksempler:** tre selvrapporterede BMS-aflæsninger, mærket ikke-verificerede, **aldrig regnet med i den interne flåde**. Eksemplerne er et dateret øjebliksbillede fra 16. oktober 2026.
- Publikationens totale **9.954 AVILOO-tests** er ikke delprøven for EV6; **EV6-testantal er ikke oplyst**. Vi viser det derfor ikke som 9.954 EV6-tests.
- Anskaffelse af rådata fra Carla kræver særskilt tilladelse/licensaftale; dette er **ikke** en fuld ekstern dataintegration.

## Kilder til den eksterne visning

- Carla (8. juli 2026): https://www.carla.se/magasinet/elbilsmarknaden/elbilsmodellerna-med-hogst-batterihalsa-efter-10-000-mil
- EV6-forum (jan.–mar. 2026): https://www.ev6-forum.de/forum/thread/3678-soh-und-km-st%C3%A4nde/

## Nye filer

- `benchmark-hub.js`: data- og viewfunktioner med kildehenvisninger og metodiske sikkerhedsregler.
- `benchmark-hub.css`: responsivt udseende for dedikeret Sammenligning-side.

## Bevarede funktioner

Navigation, dashboard, SoH-graf, Battery Fingerprint, Battery Condition, PDF-rapport, bilprofil, CSV-import, Supabase-katalog, billeder og den eksisterende benchmark-RPC er bibeholdt. Intet overskrives i Supabase af installationen.

---

# EV Pulse Benchmark v1.0.0 – Battery Intelligence

**Stor hovedopdatering af eksisterende EV Pulse Benchmark v0.10.1.**

## Før du lægger den i Git: Supabase SQL er nødvendig!

1. Tag en sikkerhedskopi af databasen i Supabase, især `vehicles` og `battery_records`.
2. Åbn **Supabase → SQL Editor** på den eksisterende EV Pulse-database.
3. Kør **`sql/07_vehicle_catalog_v1.sql`**. Dette opretter et verificeret bilkatalog og tilføjer den valgfrie `catalog_variant_key` til eksisterende køretøjer. **Eksisterende biler og målinger slettes eller omskrives ikke.** Der oprettes også en trigger, som håndhæver variantens tekniske oplysninger ved oprettelse/redigering.
4. Kør derefter **`sql/08_benchmark_catalog_v1.sql`**. Den opdaterer flådesammenligningen, så den sammenholder teknisk ens varianter og kræver mindst fem andre, uafhængige biler. Resultater for gamle profiler uden katalog-ID afventes, indtil ejeren har bekræftet sin bil.
5. Udpak denne ZIP til roden af dit Git-projekt og push til GitHub som normalt. Vercel anvender de nye statiske filer. Opdater browseren med **Ctrl+F5**.
6. Gå til **Indstillinger → Min bil**, kontrollér årgang, original/facelift, batteri, drivlinje og udstyr, og tryk **Gem bilprofil** én gang. Det knytter din eksisterende profil til kataloget **uden at ændre bilens ID eller de gamle målinger**.

> **Vigtigt:** v1.0 kan indlæse gamle profiler uden katalog-ID og bevarer historikken. Bilprofiler kan ikke gemmes med den nye variantnøgle, hvis SQL 07 ikke er kørt. **Kør SQL før Git-deploy.** `sql/03`–`06` er ældre migrationsfiler og skal ikke genkøres, hvis de allerede er installeret.

## Nyt i v1.0

### 1. Verificeret, låst bilvælger

- Ingen fritekst eller numeriske indtastninger i bilens identitet. Mærke, model, modelår, generation, batteripakke, drivlinje og udstyr vælges i dropdowns.
- Det aktuelt **verificerede katalog** dækker Kia EV6 for danske konfigurationer og modelår 2021–2026. Nye bilmærker skal føjes til et kildeverificeret katalog; appen opfinder dem ikke.
- Oprindelig EV6: **58,0 eller 77,4 kWh**. Facelift: **62,9 eller 84,0 kWh** (*nominel/gross fabriksbatteri*).
- **2025 kan være begge generationer**. Når årgang ændres til 2025, skal generation vælges eksplicit, før profilen kan gemmes.
- Vælges ugyldige kombinationer, kan de ikke gemmes. Supabase-triggeren kontrollerer uafhængigt af JavaScript årgang, generation, batteri og drivlinje. Feltet `catalog_variant_key` refererer til et godkendt katalogelement.
- Eksisterende bilprofil bevares, til du trykker Gem. Begge originale PNG-frontbilleder og de eksisterende hero-billeder bevares.

**Fabriksspecifikationer:**
- Oprindelig EV6 58,0/77,4 kWh: https://press.kiamotors.dk/pressreleases/kia-lancerer-ev6-med-stort-aabent-hus-den-20-21-november-3143857
- Opdateret EV6 62,9/84,0 kWh: https://www.kia.com/dk/modeller/ev6/digital-discover/

Kataloget er bevidst konservativt: markeds- og årgangsvarianter, som ikke er verificeret tilstrækkeligt, vises endnu ikke.

### 2. Battery Condition (ny menufunktion)

- Analyserer **kun faktiske Supabase battery_records** for den aktive bil. Ingen demo eller gættede værdier.
- Viser seneste BMS SoH, antal forskellige måledage, måledækning ved fem SoC-intervaller og dokumenteret historisk udvikling.
- Screeningsobservationer for BMS-SoH-trin, celleforskelle **≥100 mV ved 20–90 % SoC**, eksplicitte hvile-SoC-fald og eventuelle DTC-koder **der faktisk står i notefeltet**.
- Tydelig forskel mellem **observation** og **diagnose**. En celleforskel påvirkes af belastning, temperatur og SoC; tærsklen er et observationsfilter, **ikke en fabriksfejlgrænse**.
- Rapportering af målt brugbar kapacitet kræver mere end en BMS SoH og en øjeblikkelig energiværdi; ellers vises **Ikke målt**.

### 3. Diagnostisk historik

- Tidsstemplede hændelser, kun hvis målingerne understøtter dem.
- Tidspunkter omregnes til dansk lokal tid og de-duplikeres pr. hændelsestype og måledag.
- Datakilden kan ikke bevise, om bilen var parkeret, ladede eller kørte, medmindre dette er eksplicit logget. Ingen automatiske, udokumenterede diagnoser.

### 4. Battery Condition Report

- Klik **Udskriv / Gem som PDF** i Battery Condition.
- Browserens udskriftsdialog åbner med en printoptimeret A4-rapport. Vælg **Gem som PDF** i Chrome/Edge.
- Rapporten indeholder bilspecifikation, dataperiode, målestatistik, dokumenterede observationer, seneste 20 hændelser og metodeforbehold.
- Ingen VIN, nummerplade eller GPS-position indføres i rapporten.
- Rapporten oprettes lokalt i browseren fra den allerede hentede historik; den sendes ikke til nogen ekstern PDF-service.

### 5. Benchmark 2.0 og teknisk oprydning

- Backend-sammenligning efter **producent/model, generation, batteripakke, drivlinje, modelår ±2 år og kilometerstand ±25.000 km**. Udstyrstrim alene er ikke en teknisk forskel.
- Kun **andre ejere** og **én seneste SoH pr. anden bil**. Minimum **fem** sammenlignelige biler, inden statistik vises. Ingen syntetisk flåde.
- Samlet tidligere overliggende CSS til **`dashboard.css`**. Nye, testbare `battery-intelligence.js` og `vehicle-catalog.js`.
- Batterihistorik hentes med pagination, så Supabase-projektets almindelige 1.000-rækkers API-grænse ikke afkorter målingerne.
- CSV-import, bilbilleder, eksisterende brugerprofiler og de gamle datatabeller er bibeholdt.

## Filer i pakken

- `index.html`, `styles.css`, `dashboard.css`, `app.js`: website og dashboard.
- `vehicle-catalog.js`: verifierbart lokalt fabrikskatalog (suppleret af DB-håndhævelse).
- `battery-intelligence.js`: ren analysefunktion – deterministiske, testbare observationer.
- `config.js`: din eksisterende Supabase-konfiguration.
- `sql/07_vehicle_catalog_v1.sql`: ny katalogdatabase + database-trigger.
- `sql/08_benchmark_catalog_v1.sql`: aggregeret, katalogfiltreret peer benchmark.
- `assets/`: de eksisterende, uændrede bilbilleder.
- `vercel.json`: eksisterende Vercel-konfiguration.

## QA og begrænsninger

**Testet lokalt** med de 351 faktiske importrecords i et isoleret browsermiljø med mockede Supabase-svar: 30 måledage, SoH 100 → 97,5 %, 5/5 SoC-områder, fire SoH-ændringshændelser; skift til 2025 kræver eksplicit generation; valgt facelift Long Range giver 84,0 kWh; profilgemning opdaterer forside og frontbil; rapportindhold dannes; mobilbredde 390 px uden vandret sidescroll; ingen JavaScript-fejl. Supabase SQL er **ikke kørt på din produktionsdatabase**, og live-RLS/online import er ikke integrationstestet. Browserscreenshottests bruger neutral placeholder for assets, fordi testbrowserens lokale filadgang er afskåret; de faktiske billeder er med uændret i ZIP.

Ingen historiske `battery_records` opdateres af migreringen. BMS SoH = bilens egen estimation, ikke en verificeret kapacitetstest. Flådedata vises først, når backend har tilstrækkelige reelle uafhængige biler.
