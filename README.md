# EV Pulse Benchmark v0.6 · Hero Asset Matrix

v0.6 gør hero-systemet klar til rigtige billeder for hver kombination af:
- GT-Line / GT Performance
- Moonscape / Snow White Pearl / Aurora Black Pearl / Yacht Blue / Runway Red

## Hero-logik
Siden vælger automatisk korrekt fil ud fra:
- `vehicles.trim_level`
- `vehicles.exterior_color_code`

Hvis det korrekte billede findes, bruges det direkte.
Hvis filen mangler, bruges den nuværende `hero_ev6.png` som fallback og den gamle farvetoning fortsætter.

Det betyder, at vi kan udskifte hero-assets ét ad gangen uden at siden går i stykker.

## Filstruktur

assets/
  heroes/
    gt-line/
      hero_gtline_klm_moonscape.png
      hero_gtline_swp_snow-white-pearl.png
      hero_gtline_abp_aurora-black-pearl.png
      hero_gtline_du3_yacht-blue.png
      hero_gtline_cr5_runway-red.png
    gt-performance/
      hero_gtperformance_klm_moonscape.png
      hero_gtperformance_swp_snow-white-pearl.png
      hero_gtperformance_abp_aurora-black-pearl.png
      hero_gtperformance_du3_yacht-blue.png
      hero_gtperformance_cr5_runway-red.png

Se `assets/heroes/README.txt` for billedkrav.

## Anbefalet hero-format
- 1920 × 620 px
- PNG
- identisk scene/kameravinkel på alle 10 billeder
- korrekt trim og korrekt lak direkte i renderet
- mørk cinematic grading

## Supabase
Ingen ny SQL er nødvendig fra v0.5, hvis `05_vehicle_visual_config.sql` allerede er kørt.

## Deploy
Overskriv filerne i GitHub med indholdet fra ZIP'en og commit.
Vercel redeployer automatisk.
