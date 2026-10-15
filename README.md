# EV Pulse Benchmark v0.10.0 · Skarp SoH-graf og måledækning

Bygger videre på v0.9.9; bevarer Supabase, CSV-import, bilprofil, billeder og tidligere historik.

## Ændringer

- **SoH X-akse:** Vælg *Kilometer* eller *Dato* (lokal tid i Danmark), uden ændringer i måledata.
- **Skarpt SVG:** Grafens viewBox passer til den faktisk viste bredde/højde (ingen `preserveAspectRatio="none"`), bruger læselige label-skriftstørrelser og optegnes igen ved størrelsesændring. SoH er fortsat trinvist af BMS-målinger pr. dag – ikke en interpoleret batteridegradering.
- **Batteri fingeraftryk:** Radaren repræsenterer nu udelukkende målingernes datadækning (andel separate måledage med gyldig SoH, celleforskel og temperatur; tilstedeværelse af en godkendt 100 %-energireference; spredning på SoC-områder). Den er **ikke** en estimeret batterihelbredsscore.
- **SoC-dækning:** Fem synlige bånd: 0–19, 20–39, 40–59, 60–79, 80–100 %. Hvert bånd viser antal **forskellige måledage**, med >=2 dage for at tælle som dækket. 100 OBD-aflæsninger fra én dag tæller kun én dag.
- **Manglende 100 %-reference:** Grå markering + klar tekst, ikke et opdigtet kapacitetstab. `100 %` SoC i en observation er ikke nok til at være en dokumenteret energireference.
- **Ingen demomålinger** og ingen Supabase SQL-ændringer. Intet behov for at uploade CSV igen.

## Opdatering

Udpak ZIP i roden af dit Git-repository og push. Genindlæs med Ctrl+F5. Browserfanen viser v0.10.0.

## Validering

Kontrolleret statisk og med lokale browser-tests. Produktions-Supabase kræver stadig, at du tester på din egen konto.
