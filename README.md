# EV Pulse Benchmark v0.6.1 · Root Hero Fix

Denne version matcher den måde GitHub-webuploadet har lagt filerne:
alle 10 hero-billeder ligger direkte i repository-roden.

Der kræves ingen `assets/`-mappe.

Eksempel:
- index.html
- app.js
- styles.css
- hero_gtline_klm_moonscape.png
- hero_gtline_swp_snow-white-pearl.png
- ...
- hero_gtperformance_cr5_runway-red.png

`app.js` peger nu direkte på disse root-filer.

Ingen ny SQL er nødvendig, hvis v0.5 migrationen allerede er kørt.
