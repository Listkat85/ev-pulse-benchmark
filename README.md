# EV Pulse Benchmark v0.9.9 · Korrekt historikvisning

Bygger videre på **v0.9.8 Title Fix** uden at ændre bilbilleder, Supabase-tabeller eller CSV-format.

## Rettelser

- **Seneste målinger** viser nu seneste registrering fra **seks forskellige datoer** (lokal tid i Danmark). Det er ét faktisk database-record pr. dag, ikke et gennemsnit eller et opdigtet datapunkt. Hver række har et tooltip med tidspunkt og antal registreringer for den dag.
- Viser antal forskellige måledage og samlet antal Supabase-registreringer under tabellen.
- **SoH udvikling** bruger én faktisk BMS-aflæsning pr. måledag og tegner **trinvist** mellem dokumenterede SoH-niveauer; den fremstiller ikke en jævn målbar degradering mellem høje frekvens OBD-polls.
- Kurven viser tydelige punkter for BMS-ændringer, færre markører og et diskret fyld, samt en lille forklaring af datagrundlaget.
- Ingen hardkodede målinger eller simulerede flåde-/SoH-tal. **Kun Supabase.**
- `dashboard-v099.css` er nyt. Cache-busting for `app.js`/CSS er opdateret, og browserfanens titel er v0.9.9.

## Vigtigt

**Upload ikke historik-CSV igen.** Data fra tidligere import bliver stående i Supabase. Kun præsentationen ændres.

De eksisterende BMS SoH-tal er et rapporteret estimat. Trin mellem måledage dokumenterer opdateringer i BMS' rapportering, ikke tidspunktet for fysisk batterinedbrydning.

## Git

Pak ZIP'en ud i roden af repository'et og commit/push. Hard refresh (Ctrl+F5), og verificér de seks forskellige datoer samt den trinvise kurve.

## Tests

JavaScript-syntaks, statiske importreferencer og ZIP-integritet kan kontrolleres lokalt. Produktions-Supabase er ikke tilgængelig i testmiljøet.
