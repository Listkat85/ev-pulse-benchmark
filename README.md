# EV Pulse Benchmark v0.5 · Real Car + Kia Configurator

Denne version bygger videre på v0.4.1 og tilføjer:

- photorealistisk EV6-hero (`hero_ev6.png`)
- EV6-version i hero:
  - GT-Line
  - GT Performance
- Kia 2023 GT-Line/GT-farver:
  - Moonscape (KLM)
  - Snow White Pearl (SWP)
  - Aurora Black Pearl (ABP)
  - Yacht Blue (DU3)
  - Runway Red (CR5)
- visuel farvetoning af bilen
- GT Performance får en diskret grøn performance-caliper accent
- version og farve gemmes i Supabase på bilprofilen
- samme indstillinger kan redigeres under `Min bil`

## Før deploy
Kør én gang i Supabase → SQL Editor:

`sql/05_vehicle_visual_config.sql`

## Deploy
Upload/overskriv ALLE filer i GitHub-repoet, inklusive:
- index.html
- styles.css
- app.js
- hero_ev6.png
- sql/05_vehicle_visual_config.sql

Commit. Vercel redeployer automatisk.

## Bemærkning om lakfarver
Swatches er skærmtilnærmelser og ikke officiel farvekalibrering.
