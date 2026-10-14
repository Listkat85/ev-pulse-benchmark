# EV Pulse Benchmark v0.9 · Mockup Match

**Komplet GitHub/Vercel-pakke.** Den bygger direkte videre på v0.8, inklusive dine eksisterende SQL-filer, Supabase-sessioner, CSV-import og hero-billeder.

## Det er nyt
- Forsiden følger det mockup, du sendte 14. oktober: stor bil identifikation, tekniske bilfakta, 4 statuskort, SoH-graf, flådesammenligning, seneste målinger, Battery Fingerprint og 4 hurtige handlinger.
- **To helt separate billeder:** original **3/4-bagfra hero** er bevaret (samme `assets/heroes/...`), og en ny **3/4-forfra EV6** ligger til venstre (`assets/vehicles/front/`). Den ene erstatter IKKE den anden.
- Farvevisningen af frontbilen omfatter 5 lakfarver. Andre farver end Moonscape er **digitale illustrationer**, ikke verificerede Kia-produktfotos. Også GT / Standard benytter foreløbig en tydeligt mærket GT-Line-frontreference. De gamle 10 hero-billeder bagfra er urørte.
- Bilindstillinger findes kun under **Indstillinger · Min bil**. Valgt **generation + batterivariant + GT/standard** fastlægger nominel batterikapacitet automatisk. Brugeren kan ikke indtaste en vilkårlig kapacitet.
- Oprindelig EV6: Standard Range 58,0 kWh; Long Range 77,4 kWh. Facelift: Standard Range 63,0 kWh (ofte opgivet 62,9); Long Range 84,0 kWh. Årgang alene skelner ikke altid generationerne.
- SoH-historik vises i et nyt responsivt diagram, og batterifingeraftryk bygges på tilgængelige observationer. Sidstnævnte er **ikke en diagnostisk helbredskarakter**.
- Flådesammenligning læser kun aggregerede resultater fra eksisterende Supabase RPC og vises kun med mindst 5 andre, sammenlignelige biler, når SQL-opgraderingen nedenfor er anvendt. Ingen andre bilers rådata vises.
- Hurtig eksport som CSV med dine egne registreringer. PDF-rapport er stadig en senere funktion.
- Rækkeviddekortet viser `—` indtil der er brugbare forbrugsdata. Vi opfinder ikke 530 km alene ud fra SoH.

## GitHub Desktop / Vercel
1. Tag backup eller lav en ny branch på dit eksisterende repo.
2. Pak **hele ZIP-filen** ud i roden af dit `ev-pulse-benchmark`-repo (erstat filerne fra v0.8). Behold de normale git-filer (`.git`), som ikke ligger i denne ZIP.
3. Kontrollér at `index.html`, `app.js`, `styles.css`, `dashboard-v09.css`, `config.js`, `assets/` og `sql/` ligger direkte i rodmappen; undgå at lægge en ekstra mappe rundt om projektet.
4. Commit `EV Pulse Benchmark v0.9 - mockup match` og Push origin. Vercel kan så udgive den opdaterede statiske side.
5. **For mere korrekt flådesammenligning:** kør `sql/06_peer_benchmark_v09.sql` i Supabase SQL Editor **efter** den oprindelige database-opsætning. Dette erstatter den eksisterende `get_soh_benchmark` RPC med strammere match og mindst fem *andre* biler. Hvis migreringen endnu ikke er kørt, er den eksisterende RPC fortsat kompatibel, men sammenligningsgrundlaget er mindre præcist.

## Test uden konto
Åbn den deployede side med `?demo=1` (f.eks. `https://dit-domæne.dk/?demo=1`). Så vises tydeligt mærkede **DEMO-eksempeldata**, som **ikke** uploades til Supabase. Demoen kan bruges til at vurdere udseendet. Klik uden `?demo=1` for at se dine reelle data.

## Data og tekniske grænser
- Supabase-anonym login, `vehicles`-profil og CSV-upsert/dubletkontrol fra v0.8 er bevaret. Nogle fejl kan kun afprøves mod din faktiske Supabase-instans.
- Der er ingen nye baggrunds-OBD-kald, ændringer af bilen eller Kia Connect-integration.
- Samme komplette fortidige `battery_records` bruges til dashboardet. Kildeangivelser vises som CSV/OBD; feltet kan ikke pålideligt skelne original OBD fra importeret CSV uden en egentlig datakildemigration.
- Nominel kapacitet må ikke forveksles med tilgængelig energi: kortet mærkes derfor "Nominel × SoH" og ikke målt kWh ved fuld opladning.
- Flådens 25.–75. percentil tegnes som et kvartilbånd **ikke et opdigtet histogram**; der vises ikke en histogramfordeling uden den rigtige distribution.

## Kørselstjek
- JavaScript syntaks (`node --check app.js`), browser-DOM-fejl og viewport-layout 1120/1536/390 px blev testet med tydeligt markerede eksempeldata.
- Formtest: original Long Range 77,4 → facelift Long Range 84,0 → facelift Standard 63,0 kWh.
- Live-login, reelle databaseopdateringer og cloud-deploy er endnu ikke end-to-end testet og skal godkendes i eget miljø.
