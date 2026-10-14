# EV Pulse Benchmark v0.9.2 · Precision Pass

Opdatering oven på **v0.9.1 Visual Polish** med brugerens `MOCKUP.png` og screenshots fra 14. oktober 2026 som visuel reference.

## Visuelle rettelser
- Frontbilen (3/4 forfra) har sin **egen billedkomponent**, mere kompakt proportionering, mørkere lakreflektioner og bedre position. Den ligger ikke længere over første målekort eller SoH-overskriften.
- Den eksisterende 3/4-bagfra **hero bevares** i `assets/heroes` uden ændringer. Heroens placering justeres alene via CSS.
- Sidebar, topbar, modeloplysninger, fire KPI-kort, analysepaneler, tabeller, fingeraftryk og handlinger er justeret samlet, inklusive stor desktop, 1120 px og mobil.
- På større skærme tilpasser den nederste række sig skærmhøjden, så der ikke opstår et enormt tomt areal.
- Ny stilfil `dashboard-v092.css` ligger **sidst**, efter eksisterende stylesheets, og kan isoleret deaktiveres ved behov.

## Forbedret SoH-graf
- Kilometeraksen tager udgangspunkt i **faktiske registrerede kilometertal** med en passende margin. Data omkring eksempelvis 70.000 km spredes visuelt i stedet for at blive presset sammen ved siden af en kunstig 0-km akse.
- Ingen kunstige målinger, trends eller historiske flådelinjer tilføjes til ægte registreringer.
- Har bilen kun én registrering, mærkes grafen som én måling, ikke en trend.

## Hvad er uændret
- Bilprofil og låste batterier efter generation (oprindelig Long Range 77,4 kWh / facelift Long Range 84 kWh).
- Supabase-login og datamodel, CSV-import og eksport, databaserettigheder og SQL-opsætning.
- Flådeplacering vises kun ved tilstrækkelige **reelle** sammenlignelige biler. `?demo=1` viser derimod tydeligt mærkede simulationsdata til layoutvurdering.
- Bilens andre farvevarianter benytter fortsat illustrative billeder; GT og Standard har endnu ikke modelkorrekte særskilte frontfotos.
- Rækkevidde bliver ved med at stå som `—`, hvis der ikke findes troværdigt datagrundlag.

## Git / Vercel
1. Lav en branch eller backup af dit nuværende repo.
2. Pak ZIP-filen ud i **roden af samme repository** (hvor `index.html` allerede ligger). Behold `.git`.
3. Commit og push. Vercel bruger de eksisterende filer som før.
4. Besøg `https://dit-domæne/?demo=1` for simulationsvisning; fjern `?demo=1` for at se dine egne registreringer.

## Teststatus
- Kontrolleret: `node --check app.js`, DOM/JS uden runtimefejl i en isoleret browsertest samt visualisering ved 1120×747, 1792×857, 1916×906 og 390×844.
- Kontrolleret: ingen horisontal overflow i ovenstående visninger, valgte kWh-fabriksprofiler og uændrede data-/SQL-filer.
- **Ikke** kontrolleret: live-Supabase, GitHub-deployment og andre brugeres profiler i produktionsmiljøet.

Denne version er en **præcisionsforbedring**, ikke en påstand om et fuldstændigt 1:1-match med mockuppet. Andre billedassets og de mindre ikon- og detaljeforskelle kan stadig finpudses.
