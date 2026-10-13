# EV Pulse Benchmark v0.7 — CLEAN

Denne pakke er den **eneste komplette kilde**. Tidligere v0.5/0.6-filer skal ikke blandes med den.

## Projektstruktur

```
ev-pulse-benchmark/
├── index.html
├── app.js
├── styles.css
├── config.js
├── vercel.json
├── demo_battery_evidence.csv
├── assets/
│   └── heroes/
│       ├── gt-line/          (5 PNG-filer)
│       └── gt-performance/   (5 PNG-filer)
└── sql/                     (historiske SQL-scripts)
```

**Alle** 10 billeder ligger i `assets/heroes/...` — ingen `hero_*.png` i projektroden.

## Sådan uploader du korrekt

**Anbefalet: GitHub Desktop**
1. Download GitHub Desktop: https://desktop.github.com/
2. Åbn/klon dit eksisterende `ev-pulse-benchmark`-repository.
3. Pak denne ZIP ud.
4. Erstat indholdet af den lokale repo-mappe med ZIP'ens indhold (behold `.git`-mappen, som GitHub Desktop styrer).
5. I GitHub Desktop: gennemse Changes → Commit → Push origin.
6. Vercel deployer automatisk.

**Vigtigt:** GitHubs web-`Add file → Upload files` har tidligere lagt dine billeder i roden.
Hvis du uploader fra browseren, så åbn først præcis `assets/heroes/gt-line/` på GitHub,
og upload kun de fem GT-Line-billeder dér. Gentag under `assets/heroes/gt-performance/`.
Brug ikke en samlet fil-upload, der flader mapperne ud.

## Hvad der er rettet
- 10 verificerede PNG-filer i 2 rigtige mapper.
- Én central filnavnsfunktion i JavaScript.
- Ingen farve-overlay eller falske bremsekalibre (hver render har allerede den valgte farve).
- Direkte billedskift med verificering og fejlbesked hvis et asset mangler.
- Sekventiel lagring af hurtige farve/variant-ændringer.
- Bevarer Supabase, anonym session, CSV, bilprofil, SoH-tidslinje og øvrige data.
- Forbedret hero-udsnit så karrosseriet ikke zoomes så voldsomt ind.

## Supabase
**Ingen ny SQL.** Migration `sql/05_vehicle_visual_config.sql` er allerede kørt.

## Hurtig kontrol
Når du har deployet, åbn disse to URL'er:

- `https://ev-pulse-benchmark.vercel.app/assets/heroes/gt-line/hero_gtline_cr5_runway-red.png`
- `https://ev-pulse-benchmark.vercel.app/assets/heroes/gt-performance/hero_gtperformance_swp_snow-white-pearl.png`

Begge skal vise et billede, ikke 404. Derefter skal klik i heroen vælge samme fil som farven/modelnavnet.

Dette projekt er **ikke** lagt online automatisk. De 10 billedskift og skærmvisninger er testet i Chromium med simulerede Supabase-data; den rigtige Supabase-forbindelse skal kontrolleres efter deploy.
