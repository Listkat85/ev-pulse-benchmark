# EV Pulse Benchmark v0.9.7 – Generation-specific front cars

Built directly on v0.9.6. The **two user-approved transparent PNGs** are installed in `assets/vehicles/front/`:

- `ev6-original-front.png`: Original EV6 (typically 2021–2024; 77.4-kWh Long Range / 58-kWh Standard).
- `ev6-facelift-front.png`: EV6 facelift (typically model year 2025+; 84-kWh Long Range / 63-kWh Standard).

## How the correct image is selected

`app.js` selects the front PNG using `inferBatteryProfile(currentVehicle).generation`, the **same model-generation logic** that supplies the factory battery capacity. Consequently:

- 2023 Long Range → original PNG and 77.4 kWh (even when an old database row wrongly contains 84 kWh).
- 2025 Long Range with saved 84 kWh → facelift PNG and 84.0 kWh.
- 2025 Long Range with saved 77.4 kWh → original PNG (a registration/model year alone does not prove facelift).
- When the user changes **Min bil → Generation** and saves, the correct PNG appears without a hardcoded year switch.

The front PNGs are **dark gray visual references**; they do not yet reflect selected paint color/trim exactly. Rear hero backgrounds and their existing color selection are not changed. The previous front cutout is removed. Front-car CSS uses only object-fit, placement and shadow (no masks / crop effect).

### Data integrity

Unchanged v0.9.6 Supabase logic. No seeded records, demo fixture, simulated fleet metrics or fallback measurements have been added. Existing records from the production Supabase project are not modified or deleted. This package does not include credentials – preserve your existing `config.js` values and environment setup.

### Deploy

Extract the ZIP to the **root** of your existing Git repository; commit and push. Update/clear your browser cache if the old image remains visible. No SQL migration is required for these changes.

### Notes and verification

- PNG files were checked for actual alpha transparency and no fully opaque background.
- JavaScript syntax, ZIP integrity and in-browser image swapping are validated before delivery.
- The tests use mock Supabase responses only in an isolated test harness, **not** in shipped application files.

### Visual alignment

The original and facelift PNG images differ in physical aspect ratio; `dashboard-v097.css` sets separate, responsive sizes for the original front vehicle to keep the SoH chart header unobstructed. This is **CSS size and positioning only**, not cropping or fading the PNGs.
