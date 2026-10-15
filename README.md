# EV Pulse Benchmark v0.9.5 — Kun Supabase + frontbilrettelse

**Data vises nu udelukkende, når læsning fra Supabase lykkes.** Ingen indbyggede testmålinger, ingen demo-mode, ingen simuleret flådeplacering og ingen medfølgende test-CSV. `?demo=1` har ikke længere nogen særlig funktion.

- Kilder: `vehicles` og `battery_records` i Supabase; den eksisterende RPC `get_soh_benchmark` vises kun med mindst fem sammenlignelige reelle biler.
- Status **Forbundet** vises først, når både bilprofil og batterimålinger er læst fra Supabase. Ved fejl tømmes tallene og fejlen vises tydeligt.
- CSV-import i appen er fortsat tilladt, men importerede data vises på dashboardet **først efter at de er gemt og genlæst fra Supabase**. Ingen automatiske uploads eller sletninger.
- Et bedre frontbilfoto bygges fra en **eksisterende højopløst EV6-kilde**, og en indfanget baggrundsrest fjernes i selve asset. Ingen nye AI-billeder. Bilen er en illustration/reference, ikke et fabriksfoto verificeret for alle farver/modeller. Hero-bilen set bagfra er urørt.
- Cellebalancens grøn–gul–orange–røde visualisering bevares.
- Eksisterende SQL/konfiguration, bilprofiler, CSV-funktioner og skriveadgange er ikke udvidet.

**Vigtigt om gamle testmålinger:** Hvis nogen tidligere har importeret en test-CSV til Supabase, ligger posterne der stadig og bliver vist som enhver anden Supabase-post. Denne opdatering sletter *ingen* databaseposter. Verificér oprindelsen i databasen, før de vurderes som reelle målinger.

## Git
Udpak ZIP'en i roden af dit repo, overskriv projektfiler, bevar `.git`, og commit/push. `dashboard-v095.css` indlæses efter de ældre stylesheets. Lav gerne en branch først.

## Testet og ikke testet
Testet: syntaks, tilstedeværelse af filer, fravær af demo-datakode, ZIP-integritet og isoleret browseradfærd ved forskellige skærmstørrelser. Ikke testet: din produktions-Supabase, din Git-deployment, eller datakvaliteten af importerede poster.

