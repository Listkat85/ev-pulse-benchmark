# EV Pulse Benchmark v0.10.1 – Enkelt Batteri fingeraftryk

Baseret på v0.10.0. **Ingen SQL-migration, ingen ændring af Supabase-tabeller og ingen ny CSV-import.** Bevarer resten af dashboardet, grafik, profiler og historik.

## Hvad er ændret?

- Fjernet det forvirrende radardiagram. En kompakt oversigt viser separat **BMS-batteritilstand** (seneste faktiske BMS SoH) og **Måledækning** (antal SoC-intervaller med mindst to *forskellige måledage*).
- Fem kompakte SoC-bånd fortæller **hvor og hvor ofte** der er målt. Bjælkelængden er relativ til området med flest målte dage og er **ikke** en sundhedsvurdering.
- Dokumenteret `FULL_CHARGE_REFERENCE` med gyldig energi ved >=99 % SoC identificeres særskilt. Manglende reference giver beskeden **Kapacitetstest mangler**, ikke en lav helbredsscore.
- Manglende SoH vises som `—`, og der konstrueres ingen falske batteriværdier.
- Gensidigt uafhængige måledage i `Europe/Copenhagen`, så tætte OBD-aflæsninger ikke overdriver antallet af dage.
- Ny versionsspecifik CSS og cache-busting JS/CSS `0101`; browserfanen viser **v0.10.1**.

## Installation

Udpak alle filer i **roden** af dit Git-repository og push som tidligere. Genindlæs siden med Ctrl+F5, hvis browseren har cachet den gamle version.

## Data & begrænsninger

Kun eksisterende faktiske Supabase-målinger benyttes. En BMS SoH-værdi er ikke en uafhængig kapacitetstest; 5/5 måledækning fortæller ikke, at batteriet er 100 % sundt. Denne version ændrer kun præsentationen.
