(() => {
  console.info("EV Pulse Benchmark v0.10.0 · sharp SoH chart axes and measured SoC coverage");
  const cfg = window.EVPULSE_CONFIG;
  let sb = null;
  let sessionUser = null;
  let currentVehicle = null;
  let currentRecords = [];
  let parsedRows = [];
  let currentBenchmark = null;

  // One canonical map. Every file lives at the same path in the ZIP and in GitHub.
  const HERO_ROOT = "./assets/heroes/";
  const EV6_PAINTS = [
    {code:"KLM", name:"Moonscape", hex:"#8B8B88", file:"klm_moonscape"},
    {code:"SWP", name:"Snow White Pearl", hex:"#F3F4F1", file:"swp_snow-white-pearl"},
    {code:"ABP", name:"Aurora Black Pearl", hex:"#0B0D10", file:"abp_aurora-black-pearl"},
    {code:"DU3", name:"Yacht Blue", hex:"#1A477F", file:"du3_yacht-blue"},
    {code:"CR5", name:"Runway Red", hex:"#9B2B31", file:"cr5_runway-red"}
  ];
  const EV6_TRIMS = {
    "Standard": {folder:"standard", stem:"hero_standard_", label:"EV6 Standard"},
    "GT-Line": {folder:"gt-line", stem:"hero_gtline_", label:"GT-Line"},
    "GT Performance": {folder:"gt-performance", stem:"hero_gtperformance_", label:"GT (Performance)"}
  };
  // Approved transparent PNG images. No screenshots, clipping or CSS recoloring.
  const EV6_FRONT_IMAGES = Object.freeze({
    original: "./assets/vehicles/front/ev6-original-front.png",
    facelift: "./assets/vehicles/front/ev6-facelift-front.png"
  });
  function frontImageFor(vehicle) {
    return EV6_FRONT_IMAGES[inferBatteryProfile(vehicle).generation];
  }
  // Verified factory nominal *gross* kWh, kept distinct from measured usable energy.
  // The 2025 registration year alone cannot identify facelift: user chooses generation.
  const EV6_BATTERY_PROFILES = Object.freeze({
    original: Object.freeze({ standard:58.0, long:77.4 }),
    facelift: Object.freeze({ standard:63.0, long:84.0 })
  });
  // Source of truth for factory specifications: EV6 model year + pack,
  // NEVER a previously entered battery figure that can be wrong in Supabase.
  // A 2023 Long Range cannot be reinterpreted as an 84-kWh facelift just
  // because a legacy row accidentally stored 84.
  function inferBatteryProfile(vehicle) {
    const year = num(vehicle?.model_year);
    const nominal = num(vehicle?.battery_nominal_kwh);
    const smallPack = nominal !== null && [58,62.9,63].some(kwh=>Math.abs(nominal-kwh)<.2);
    const trim = vehicle?.trim_level;
    const pack = trim === "GT Performance" ? "long" : smallPack ? "standard" : "long";
    const generation = year !== null && year < 2025 ? "original" :
      nominal !== null && [58,77.4].some(kwh=>Math.abs(nominal-kwh)<.2) ? "original" : "facelift";
    return {pack,generation};
  }
  function resolveFactoryBattery({generation,pack,trim}) {
    const version = generation === "facelift" ? "facelift" : "original";
    const capacity = EV6_BATTERY_PROFILES[version][trim === "GT Performance" ? "long" : pack === "standard" ? "standard" : "long"];
    return Number(capacity);
  }
  function formProfile(form) {
    const trim = trimFromForm(form);
    const selectedGeneration = form.elements.namedItem("generation")?.value || "original";
    const year = num(form.elements.namedItem("model_year")?.value);
    const generation = year !== null && year < 2025 ? "original" :
      selectedGeneration === "facelift" ? "facelift" : "original";
    const pack = form.elements.namedItem("battery_pack")?.value === "standard" ? "standard" : "long";
    return { trim,generation,pack:trim==="GT Performance"?"long":pack,
      capacity:resolveFactoryBattery({generation,pack,trim}) };
  }
  // A model-year edit is an intentional change: suggest the generation for that
  // model year immediately. A 2025 pre-facelift can still be selected explicitly.
  // The stored kWh continues to distinguish the generations without DB migration.
  function defaultGenerationForChangedYear(form) {
    const year = num(form?.elements?.namedItem("model_year")?.value);
    const field = form?.elements?.namedItem("generation");
    if (!field || year === null) return;
    field.value = year >= 2025 ? "facelift" : "original";
  }

  function syncVehicleFactoryProfile(form) {
    if (!form) return;
    const profile = formProfile(form);
    const capacityField = form.elements.namedItem("battery_nominal_kwh");
    if (capacityField) capacityField.value = profile.capacity.toFixed(1);
    const output = form.querySelector("[data-factory-capacity]");
    if (output) output.textContent = profile.capacity.toLocaleString("da-DK",{minimumFractionDigits:1,maximumFractionDigits:1})+" kWh";
    const packField = form.elements.namedItem("battery_pack");
    if (packField) packField.disabled = profile.trim === "GT Performance";
    const year = num(form.elements.namedItem("model_year")?.value);
    const generationField = form.elements.namedItem("generation");
    if (generationField) {
      generationField.value = profile.generation;
      generationField.disabled = year !== null && year < 2025;
    }
    const notice = form.querySelector("[data-profile-year-note]");
    if (notice) notice.textContent = year>=2025 ? "2025+ foreslår facelift automatisk. Du kan stadig vælge oprindelig EV6 manuelt." :
      (profile.generation === "facelift" ? "Kontroller generationen: facelift er normalt fra modelår 2025." : "Før 2025 er den oprindelige generation låst og batteriet beregnes ud fra den.");
  }
  let heroLoadToken = 0;


  function heroPath(trim, colorCode) {
    const model = EV6_TRIMS[trim] || EV6_TRIMS["GT-Line"];
    const paint = EV6_PAINTS.find(p => p.code === colorCode) || EV6_PAINTS[0];
    return HERO_ROOT + model.folder + "/" + model.stem + paint.file + ".png";
  }

  function setHeroAsset(trim, colorCode) {
    const token = ++heroLoadToken;
    const image = q("heroImage");
    const background = q("heroPhoto");
    const status = q("heroAssetStatus");
    if (!image || !background) return;

    const path = heroPath(trim, colorCode);
    const fallback = heroPath("GT-Line", colorCode);
    const probe = new Image();
    image.classList.add("is-loading");

    const display = (chosen, isReference) => {
      if (token !== heroLoadToken) return;
      image.src = chosen;
      background.dataset.heroAsset = chosen;
      background.style.setProperty("--active-hero-url", `url("${chosen}")`);
      image.classList.remove("is-loading");
      if (isReference) {
        status.textContent = "Illustrationsfoto: GT-Line. Egne Standard-billeder er endnu ikke tilføjet.";
        status.classList.remove("hidden");
      } else {
        status.classList.add("hidden");
        status.textContent = "";
      }
    };
    probe.onload = () => display(path, false);
    probe.onerror = () => {
      if (token !== heroLoadToken) return;
      if (trim === "Standard") {
        // Standard selection works now, without claiming an unavailable Standard photo is exact.
        display(fallback, true);
      } else {
        image.classList.remove("is-loading");
        status.textContent = "Hero-foto mangler i assets/heroes. Kontrollér filerne i GitHub.";
        status.classList.remove("hidden");
        console.error("EV Pulse: missing hero:", path);
      }
    };
    probe.src = path;
  }

  const q = (id) => document.getElementById(id);
  const num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (v, digits = 1) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v))
    ? Number(v).toLocaleString("da-DK", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";
  const dateFmt = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("da-DK", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit", timeZone:"Europe/Copenhagen" });
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setMessage = (el, text, type = "") => {
    el.textContent = text || "";
    el.className = "form-message" + (type ? " " + type : "");
  };
  const setOnline = (online, text) => {
    q("sideStatusDot").classList.toggle("online", online);
    q("sideStatusDot").classList.toggle("error", !online && text && text !== "Forbinder…");
    q("sideStatus").textContent = text;
    q("connectionPill").textContent = text;
  };

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') { cell += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        row.push(cell); cell = "";
      } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cell); cell = "";
        if (row.some(v => v !== "")) rows.push(row);
        row = [];
      } else cell += ch;
    }
    if (cell.length || row.length) {
      row.push(cell);
      if (row.some(v => v !== "")) rows.push(row);
    }
    if (!rows.length) return [];
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(cols => Object.fromEntries(headers.map((h, i) => [h, (cols[i] ?? "").trim()])));
  }

  function clientRecordId(row) {
    const raw = [row.timestamp, row.type, row.odometer_km, row.soc_percent, row.remaining_kwh].join("|");
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return "csv1_" + (hash >>> 0).toString(16).padStart(8, "0") + "_" + row.timestamp;
  }

  function mapRow(row) {
    const epoch = num(row.timestamp);
    const recordedAt = epoch ? new Date(epoch).toISOString() : null;
    return {
      vehicle_id: currentVehicle.id,
      recorded_at: recordedAt,
      odometer_km: num(row.odometer_km),
      previous_odometer_km: num(row.previous_odometer_km),
      gap_duration_ms: num(row.gap_ms),
      record_type: row.type || "OBSERVATION",
      vehicle_state: null,
      soh_percent: num(row.soh_percent),
      soc_display_percent: num(row.soc_percent),
      previous_soc_percent: num(row.previous_soc_percent),
      soc_bms_percent: num(row.soc_bms),
      remaining_energy_kwh: num(row.remaining_kwh),
      previous_remaining_energy_kwh: num(row.previous_remaining_kwh),
      battery_temp_min_c: num(row.temp_min_c),
      battery_temp_max_c: num(row.temp_max_c),
      battery_temp_avg_c: (() => {
        const a = num(row.temp_min_c), b = num(row.temp_max_c);
        return a !== null && b !== null ? (a + b) / 2 : null;
      })(),
      cell_delta_mv: num(row.cell_delta_mv),
      min_cell_number: num(row.min_cell_no),
      note: row.note || "",
      client_record_id: clientRecordId(row),
      source_app_version: "battery-evidence-csv",
      schema_version: 1
    };
  }

  async function ensureAnonymousSession() {
    const { data: existing } = await sb.auth.getSession();
    if (existing?.session?.user) return existing.session.user;
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  }

  async function loadVehicle() {
    if (!sessionUser?.id) throw new Error("Ingen aktiv Supabase-bruger.");
    const { data, error } = await sb.from("vehicles").select("*")
      .eq("owner_user_id", sessionUser.id)
      .order("created_at", { ascending: true }).limit(1);
    if (error) throw error;
    currentVehicle = data?.[0] || null;
    renderVehicleState();
    return currentVehicle;
  }

  async function loadRecords() {
    if (!currentVehicle) { currentRecords = []; renderDashboard(); return; }
    const { data, error } = await sb.from("battery_records").select("*").eq("vehicle_id", currentVehicle.id).order("recorded_at", { ascending: true }).limit(5000);
    if (error) throw error;
    currentRecords = data || [];
    renderDashboard();
    await loadBenchmark();
  }

  function displayTrim(trim) {
    return EV6_TRIMS[trim]?.label || "GT-Line";
  }

  function paintByCode(code) {
    return EV6_PAINTS.find(p => p.code === code) || EV6_PAINTS[0];
  }

  function trimFromForm(form) {
    const trim = form?.elements?.namedItem("trim_level")?.value;
    return EV6_TRIMS[trim] ? trim : "GT-Line";
  }

  function colorFromForm(form) {
    return paintByCode(form?.elements?.namedItem("exterior_color_code")?.value || "KLM");
  }

  function renderPaintSwatches(form) {
    const container = q("vehiclePaintSwatches");
    if (!container || !form) return;
    const selected = colorFromForm(form).code;
    container.innerHTML = EV6_PAINTS.map(p => `
      <button type="button" class="paint-swatch ${p.code === selected ? "active" : ""}"
        data-paint="${p.code}" style="--swatch:${p.hex}"
        title="${esc(p.name)} (${p.code})" aria-label="${esc(p.name)}" aria-pressed="${p.code === selected}"></button>`).join("");
    q("vehiclePaintName").textContent = `${paintByCode(selected).name} · ${selected}`;
  }

  function refreshVehiclePreview() {
    const form = q("vehicleEditForm");
    if (!currentVehicle || !form) return;
    const trim = trimFromForm(form);
    const paint = colorFromForm(form);
    const preview = q("vehiclePreviewImage");
    const label = q("vehiclePreviewLabel");
    const note = q("vehiclePreviewNote");
    label.textContent = `${displayTrim(trim)} · ${paint.name}`;
    const expected = heroPath(trim, paint.code);
    const fallback = heroPath("GT-Line", paint.code);
    // The front-car preview is synchronous and independent of the scenic rear hero.
    // It follows the *draft* form while the user edits; the dashboard still reflects
    // the saved Supabase vehicle until the Save operation succeeds.
    const draft = formProfile(form);
    const frontPreview = q("vehicleFrontPreviewImage");
    if (frontPreview) {
      const source = EV6_FRONT_IMAGES[draft.generation];
      if (frontPreview.getAttribute("src") !== source) frontPreview.setAttribute("src", source);
      frontPreview.alt = draft.generation === "facelift"
        ? "Kia EV6 facelift set skråt forfra"
        : "Kia EV6 oprindelig generation set skråt forfra";
      frontPreview.dataset.generation = draft.generation;
    }
    const frontLabel = q("vehicleFrontPreviewLabel");
    if (frontLabel) frontLabel.textContent =
      `${draft.generation === "facelift" ? "Facelift" : "Oprindelig EV6"} · ${draft.capacity.toLocaleString("da-DK", {minimumFractionDigits:1,maximumFractionDigits:1})} kWh`;
    const probe = new Image();
    // Ignore delayed responses to rapidly changing selections.
    const token = expected + ":" + Date.now() + ":" + Math.random();
    preview.dataset.token = token;
    probe.onload = () => {
      if (preview.dataset.token !== token) return;
      preview.src = expected;
      note.textContent = "Visuel modelreference · Kia-lakfarver kan afvige fra skærmvisningen.";
    };
    probe.onerror = () => {
      if (preview.dataset.token !== token) return;
      preview.src = fallback;
      note.textContent = trim === "Standard"
        ? "Referencemotiv: GT-Line. Standard er valgt korrekt, men har endnu ikke egne hero-billeder."
        : "Billedreference ikke fundet. Kontrollér assets/heroes i GitHub.";
    };
    probe.src = expected;
  }

  function applyVehicleVisual() {
    const trim = EV6_TRIMS[currentVehicle?.trim_level] ? currentVehicle.trim_level : "GT-Line";
    const paint = paintByCode(currentVehicle?.exterior_color_code || "KLM");
    q("heroVersionBadge").textContent = displayTrim(trim);
    setHeroAsset(trim, paint.code);
    // The transparent front image is independent of the scenic rear-view hero.
    // Use the resolved vehicle generation (NOT registration year alone).
    const front = q("frontVehicleImage");
    if (front) {
      const frontGeneration = currentVehicle ? inferBatteryProfile(currentVehicle).generation : "original";
      const frontSource = currentVehicle ? frontImageFor(currentVehicle) : EV6_FRONT_IMAGES.original;
      if (front.getAttribute("src") !== frontSource) front.setAttribute("src",frontSource);
      front.classList.toggle("hidden", !currentVehicle);
      front.dataset.generation = frontGeneration;
      front.parentElement.dataset.generation = frontGeneration;
      front.alt = `Kia EV6 ${frontGeneration === "facelift" ? "facelift (2025+)" : "oprindelig generation (2021–2024)"} set skråt forfra`;
      const note = q("frontVehicleNote");
      if (note) note.textContent = "";
    }
    refreshVehiclePreview();
  }

  function vehicleEditMarkup() {
    if (!currentVehicle) return '<div class="empty-state">Opret først bilprofilen.</div>';
    const trim = EV6_TRIMS[currentVehicle.trim_level] ? currentVehicle.trim_level : "GT-Line";
    const color = currentVehicle.exterior_color_code || "KLM";
    const variant = currentVehicle.variant || "RWD";
    const paint = paintByCode(color);
    const profile = inferBatteryProfile(currentVehicle);
    return `
      <div class="vehicle-form-section"><div class="eyebrow">BILIDENTITET</div><h3>Model og drivlinje</h3>
        <div class="vehicle-fields">
          <label>Mærke<input name="manufacturer" value="Kia" readonly></label>
          <label>Model<input name="model" value="EV6" readonly></label>
          <label>Modelår<input name="model_year" type="number" min="2021" max="2032" value="${esc(currentVehicle.model_year || 2023)}" required></label>
          <label>Drivlinje<select name="variant"><option value="RWD" ${variant==="RWD"?"selected":""}>RWD · Baghjulstræk</option><option value="AWD" ${variant==="AWD"?"selected":""}>AWD · Firehjulstræk</option></select></label>
          <label>Generation<select name="generation"><option value="original" ${profile.generation==="original"?"selected":""}>Oprindelig (77,4/58 kWh)</option><option value="facelift" ${profile.generation==="facelift"?"selected":""}>Facelift (84/63 kWh)</option></select></label>
          <label>Batterivariant<select name="battery_pack"><option value="standard" ${profile.pack==="standard"?"selected":""}>Standard Range</option><option value="long" ${profile.pack==="long"?"selected":""}>Long Range</option></select></label>
          <label>Nominal fabriksbatteri<input name="battery_nominal_kwh" value="${esc(resolveFactoryBattery({...profile,trim}))}" readonly tabindex="-1" aria-label="Låst nominel batterikapacitet"></label>
          <label>Platform<input name="platform" value="E-GMP" readonly></label>
        </div><p class="vehicle-settings-hint" data-profile-year-note>Tekniske specifikationer styres af modelgeneration og batterivariant.</p></div>
      <div class="vehicle-form-section"><div class="eyebrow">KIA EV6</div><h3>Udstyrsvariant</h3>
        <div class="trim-options" role="group" aria-label="Vælg udstyrsvariant">
          ${Object.entries(EV6_TRIMS).map(([key,data]) => `<label class="trim-card"><input type="radio" name="trim_level" value="${key}" ${key===trim?"checked":""}><span>${esc(data.label)}</span></label>`).join("")}
        </div><p class="vehicle-settings-hint">GT Performance har AWD og Long Range som låste tekniske valg. Udstyrsvariant og drivlinje er forskellige oplysninger.</p>
      </div>
      <div class="vehicle-form-section"><div class="eyebrow">KARROSSERI</div><h3>Original Kia-farve</h3>
        <input type="hidden" name="exterior_color_code" value="${esc(paint.code)}">
        <div class="vehicle-color-row"><div id="vehiclePaintSwatches" class="paint-swatches"></div><span id="vehiclePaintName" class="paint-name">${esc(paint.name)}</span></div>
        <p class="vehicle-settings-hint">Hero-billedet bagfra følger den valgte farve. Den fritlagte frontbil skifter mellem oprindelig EV6 og facelift efter bilens generation; begge frontbilleder er mørkegrå referenceillustrationer og skifter endnu ikke lakfarve.</p>
      </div>
      <div class="vehicle-save-row"><button class="primary-btn" type="submit">Gem bilprofil</button><span>Fabriksbatteri: <strong data-factory-capacity></strong> · Gemmes i din eksisterende Supabase-profil.</span></div>`;
  }

  function renderVehicleState() {
    const setup = q("setupPanel");
    if (!currentVehicle) {
      setup.classList.remove("hidden");
      q("vehicleLine").textContent = "Ingen bilprofil endnu";
      q("vehicleChip").textContent = "Min bil";
      q("heroModelDescription").textContent = "Tilføj din bil ›";
      for (const key of ["specBattery","specDrive","specYear","specColor"]) q(key).textContent = "—";
      q("vehicleEditForm").innerHTML = '<div class="empty-state">Opret først bilprofilen øverst.</div>';
      applyVehicleVisual();
      syncVehicleFactoryProfile(q("vehicleForm"));
      return;
    }
    setup.classList.add("hidden");
    const vehicleName = [currentVehicle.manufacturer, currentVehicle.model].filter(Boolean).join(" ") || "Kia EV6";
    const profile = inferBatteryProfile(currentVehicle);
    const label = `${profile.pack==="long"?"Long Range":"Standard Range"} ${currentVehicle.variant||"RWD"} (${currentVehicle.model_year||"—"})`;
    q("vehicleChip").textContent = vehicleName;
    q("heroModelDescription").innerHTML = `${esc(label)} <span aria-hidden="true">›</span>`;
    q("specBattery").textContent = `${fmt(resolveFactoryBattery({...profile,trim:currentVehicle.trim_level}),1)} kWh`;
    q("specDrive").textContent = currentVehicle.variant||"—";
    q("specYear").textContent = currentVehicle.model_year||"—";
    q("specColor").textContent = paintByCode(currentVehicle.exterior_color_code||"KLM").name;
    q("vehicleLine").textContent = label;
    q("sideVehicle").textContent = vehicleName;
    q("vehicleEditForm").innerHTML = vehicleEditMarkup();
    renderPaintSwatches(q("vehicleEditForm"));
    syncVehicleFactoryProfile(q("vehicleEditForm"));
    const expected=resolveFactoryBattery({...profile,trim:currentVehicle.trim_level});
    const stored=num(currentVehicle.battery_nominal_kwh);
    if(stored!==null && Math.abs(stored-expected)>.2) {
      const el=document.createElement("p");
      el.className="vehicle-spec-warning";
      el.textContent=`Supabase har en ældre batteriværdi (${fmt(stored,1)} kWh), som ikke passer til bilprofilen (${fmt(expected,1)} kWh). Vælg Gem bilprofil for at rette denne værdi i din egen databasepost.`;
      q("vehicleEditForm").prepend(el);
    }
    applyVehicleVisual();
  }

  function latestValid(field, records = currentRecords) {
    for (let i = records.length - 1; i >= 0; i--) {
      const v = Number(records[i][field]);
      if (Number.isFinite(v) && v > 0) return v;
    }
    return null;
  }

  function renderDashboard() {
    const records = currentRecords;
    const latestSoh = latestValid("soh_percent");
    const full = records.filter(r => r.record_type === "FULL_CHARGE_REFERENCE" && num(r.remaining_energy_kwh)>0);
    const delta = [...records].reverse().find(r => num(r.cell_delta_mv)!==null && num(r.cell_delta_mv)>=0);
    const temps = [...records].reverse().find(r => num(r.battery_temp_avg_c)!==null || (num(r.battery_temp_min_c)!==null&&num(r.battery_temp_max_c)!==null));
    const temp = temps && (num(temps.battery_temp_avg_c) ?? (num(temps.battery_temp_min_c)+num(temps.battery_temp_max_c))/2);
    const latestRecord = records.at(-1);
    q("metricSoh").textContent = latestSoh===null?"—":fmt(latestSoh,1)+" %";
    q("heroSoh").textContent = latestSoh===null?"—":fmt(latestSoh,1);
    q("metricSohMeta").textContent = latestSoh===null?"Ingen SoH-målinger":"BMS SoH · kilde: Supabase";
    const capacity = currentVehicle ? resolveFactoryBattery({...inferBatteryProfile(currentVehicle),trim:currentVehicle.trim_level}) : null;
    q("metricCapacityEstimate").textContent = latestSoh===null || capacity===null ? "Estimeret kapacitet: —" : `Nominel × SoH ≈ ${fmt(capacity*latestSoh/100,1)} kWh`;
    q("sohMeter").style.width = latestSoh===null?"0%":`${Math.max(0,Math.min(100,latestSoh))}%`;
    // The uploaded Battery Evidence CSV has no reliable consumption or range value.
    q("metricRange").textContent = "—";
    q("metricRangeMeta").textContent = "Kræver forbrugsdata";
    q("rangeMeter").style.width = "0%";
    q("metricDelta").textContent = delta?`${fmt(delta.cell_delta_mv,0)} mV`:"—";
    q("metricDeltaMeta").textContent = delta?`Seneste: ${dateFmt(delta.recorded_at)}`:"Ingen målinger";
    q("metricDeltaContext").textContent = delta?`${fmt(delta.soc_display_percent,0)} % SoC · mål ved sammenlignelige forhold`:"Afhænger af SoC og belastning";
    q("deltaMeter").style.width = delta ? `${Math.max(0,Math.min(100, num(delta.cell_delta_mv)/4))}%` : "0%";
    q("metricTemp").textContent = Number.isFinite(temp)?`${fmt(temp,0)} °C`:"—";
    q("metricTempMeta").textContent = temps?`Seneste: ${dateFmt(temps.recorded_at)}`:"Ingen temperaturmålinger";
    q("metricTempContext").textContent = temps&&num(temps.battery_temp_min_c)!==null?`${fmt(temps.battery_temp_min_c,0)}° min. · ${fmt(temps.battery_temp_max_c,0)}° maks.`:"Batteritemperatur";
    q("tempMeter").style.width = Number.isFinite(temp)?`${Math.max(0,Math.min(100,(temp+20)*1.35))}%`:"0%";
    q("heroInsight").textContent = records.length ? `${records.length} målinger · senest ${dateFmt(latestRecord?.recorded_at)}` : "Upload batterihistorik for at bygge tidslinjen.";
    renderSohChart(); renderEvidenceList(); renderFingerprint(); renderBenchmark();
  }

  function chartRecordsForPeriod() {
    const period=q("chartPeriod")?.value || "12m";
    if(period==="all") return currentRecords;
    const maxTime = Math.max(Date.now(), ...currentRecords.map(r => new Date(r.recorded_at).getTime()||0));
    const threshold=maxTime - (period==="6m"?183:365)*86400000;
    return currentRecords.filter(r=>new Date(r.recorded_at).getTime()>=threshold);
  }
  // Group repeated high-frequency OBD measurements by calendar day in Denmark.
  // A BMS SoH reading is a discrete ECU estimate, not a new laboratory capacity
  // measurement each time the OBD dongle polls it. Keep the *last* reading on
  // each measurement day, and plot updates as steps instead of a fictitious slope.
  function measurementDayKey(recordedAt) {
    const d = new Date(recordedAt);
    if (Number.isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone:'Europe/Copenhagen', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(d);
    const p=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function lastPerMeasurementDay(records, validate = () => true) {
    const daily = new Map();
    [...records].sort((a,b)=>new Date(a.recorded_at)-new Date(b.recorded_at)).forEach(r=>{
      const key=measurementDayKey(r.recorded_at);
      if(key && validate(r))daily.set(key,r);
    });
    return [...daily.values()];
  }
  function renderSohChart() {
    const chart=q('sohChart');
    if (!chart) return;
    const axis=q('chartXAxis')?.value === 'date' ? 'date' : 'km';
    // One verified BMS value from each local calendar day, not every OBD poll.
    const source=chartRecordsForPeriod().filter(r=>
      num(r.soh_percent)!==null && num(r.soh_percent)>0 &&
      num(r.odometer_km)!==null && Number.isFinite(new Date(r.recorded_at).getTime())
    );
    const daily=lastPerMeasurementDay(source);
    const pts=daily.map(r=>({km:Number(r.odometer_km),time:new Date(r.recorded_at).getTime(),y:Number(r.soh_percent)}))
      .sort((a,b)=>axis==='date'?a.time-b.time:a.km-b.km||a.time-b.time);
    if (!pts.length) {
      chart.innerHTML='<div class="empty-state">Ingen SoH-målinger for den valgte periode.</div>';
      return;
    }
    // SVG coordinate units match displayed CSS pixels. The old 940x205 SVG
    // was stretched into a ~130px-high box with preserveAspectRatio="none",
    // squashing glyphs and making the graph blurry on high-resolution screens.
    const bounds=chart.getBoundingClientRect();
    const w=Math.max(320,Math.round(bounds.width||chart.clientWidth||700));
    const h=Math.max(116,Math.round((bounds.height||150)-18));
    const L=axis==='date'?57:55, R=18, T=13, B=30;
    const xOf=p=>axis==='date'?p.time:p.km;
    const xlo=Math.min(...pts.map(xOf)),xhi=Math.max(...pts.map(xOf));
    const span=xhi-xlo;
    const pad=axis==='date'?Math.max(86400000,span*.035):Math.max(250,span*.045);
    const minX=axis==='date'?xlo-pad:Math.max(0,xlo-pad);
    const maxX=Math.max(minX+(axis==='date'?86400000:500),xhi+pad);
    const minSoH=Math.min(...pts.map(p=>p.y)),maxSoH=Math.max(...pts.map(p=>p.y));
    let minY=Math.max(0,Math.floor(minSoH-1));
    let maxY=Math.min(105,Math.ceil(maxSoH+1));
    if(maxY-minY<3){minY=Math.max(0,Math.floor((maxY+minY)/2-1.5));maxY=Math.min(105,minY+3)}
    const sx=x=>L+(x-minX)/(maxX-minX)*(w-L-R);
    const sy=y=>T+(maxY-y)/(maxY-minY)*(h-T-B);
    const shortDate=ms=>new Intl.DateTimeFormat('da-DK',{timeZone:'Europe/Copenhagen',day:'numeric',month:'short'}).format(new Date(ms));
    const minLocalYear=new Intl.DateTimeFormat('da-DK',{timeZone:'Europe/Copenhagen',year:'numeric'}).format(new Date(xlo));
    const maxLocalYear=new Intl.DateTimeFormat('da-DK',{timeZone:'Europe/Copenhagen',year:'numeric'}).format(new Date(xhi));
    const dateTick=ms=>shortDate(ms)+(minLocalYear!==maxLocalYear?' '+new Intl.DateTimeFormat('da-DK',{timeZone:'Europe/Copenhagen',year:'numeric'}).format(new Date(ms)):'');
    const xTick=axis==='date'?dateTick:(x=>Math.round(x).toLocaleString('da-DK'));
    const xTicks=w<500?3:w<730?4:5;
    const yTicks=4;
    let grids='',labels='';
    for(let i=0;i<=yTicks;i++){
      const y=minY+(maxY-minY)*i/yTicks,yy=sy(y);
      grids+=`<line x1="${L}" x2="${w-R}" y1="${yy.toFixed(2)}" y2="${yy.toFixed(2)}" stroke="#9abbd6" stroke-opacity=".17" stroke-width=".75" vector-effect="non-scaling-stroke"/>`;
      labels+=`<text x="${L-10}" y="${(yy+3.5).toFixed(2)}" text-anchor="end" font-size="11.5" fill="#d3e3ef">${Number.isInteger(y)?fmt(y,0):fmt(y,1)} %</text>`;
    }
    for(let i=0;i<=xTicks;i++){
      const x=minX+(maxX-minX)*i/xTicks,xx=sx(x);
      grids+=`<line x1="${xx.toFixed(2)}" x2="${xx.toFixed(2)}" y1="${T}" y2="${h-B}" stroke="#9abbd6" stroke-opacity=".10" stroke-width=".75" vector-effect="non-scaling-stroke"/>`;
      labels+=`<text x="${xx.toFixed(2)}" y="${h-8}" text-anchor="${i===0?'start':i===xTicks?'end':'middle'}" font-size="11.5" fill="#c3d7e6">${esc(xTick(x))}</text>`;
    }
    let path=`M${sx(xOf(pts[0])).toFixed(2)},${sy(pts[0].y).toFixed(2)}`;
    for(let i=1;i<pts.length;i++){
      const p=pts[i];
      path+=` H${sx(xOf(p)).toFixed(2)} V${sy(p.y).toFixed(2)}`;
    }
    const base=sy(minY);
    const area=`${path} L${sx(xOf(pts.at(-1))).toFixed(2)},${base.toFixed(2)} L${sx(xOf(pts[0])).toFixed(2)},${base.toFixed(2)} Z`;
    const important=pts.filter((p,i)=>i===0||i===pts.length-1||Math.abs(p.y-pts[i-1].y)>.05);
    const markers=important.map(p=>`<circle cx="${sx(xOf(p)).toFixed(2)}" cy="${sy(p.y).toFixed(2)}" r="3.2" fill="#75c7fa" stroke="#0b2133" stroke-width="1.5" vector-effect="non-scaling-stroke"><title>${fmt(p.y,1)} % · ${p.km.toLocaleString('da-DK')} km · ${dateFmt(new Date(p.time).toISOString())}</title></circle>`).join('');
    const levels=new Set(pts.map(p=>p.y.toFixed(2))).size;
    const note=`${pts.length} måledage · ${levels} BMS-niveauer · ${axis==='date'?'datoakse':'kilometerakse'}`;
    chart.innerHTML=`<svg role="img" aria-label="BMS SoH vist trinvist efter ${axis==='date'?'dato':'kilometerstand'} på ${pts.length} måledage" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="sohFill010" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2c9ff0" stop-opacity=".20"/><stop offset="100%" stop-color="#2c9ff0" stop-opacity="0"/></linearGradient></defs>${grids}${labels}<path d="${area}" fill="url(#sohFill010)"/><path d="${path}" fill="none" stroke="#59b9fa" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>${markers}</svg><div class="soh-chart-note" aria-label="Grafens datagrundlag">${esc(note)}</div>`;
  }

  function renderBenchmark() {
    const box=q("benchmarkVisualization"), data=currentBenchmark;
    const hasSoH=currentVehicle && currentRecords.some(r=>num(r.soh_percent)>0);
    if(!hasSoH) {
      box.innerHTML='<div class="benchmark-placeholder"><strong>Ingen SoH-målinger endnu</strong><span>Importér batterihistorik for at starte sammenligningen.</span></div>';
      return;
    }
    if(currentVehicle) {
      const expected=resolveFactoryBattery({...inferBatteryProfile(currentVehicle),trim:currentVehicle.trim_level});
      const stored=num(currentVehicle.battery_nominal_kwh);
      if(stored!==null && Math.abs(stored-expected)>.2) {
        box.innerHTML='<div class="benchmark-placeholder"><strong>Bilprofil skal opdateres</strong><span>Den gemte batteristørrelse stemmer ikke med bilens modelår. Ret den under Min bil før flådesammenligning.</span></div>';
        return;
      }
    }
    if(!data || Number(data.sample_size)<5 || num(data.percentile)===null) {
      box.innerHTML='<div class="benchmark-placeholder"><strong>Afventer flådedata</strong><span>Mindst 5 sammenlignelige biler med faktiske målinger fra Supabase kræves, før vi viser en placering.</span></div>';
      return;
    }
    const p=Math.max(0,Math.min(100,num(data.percentile))), median=num(data.median_soh),low=num(data.p25_soh),high=num(data.p75_soh);
    const rank=p>=50?`Bedre end ${fmt(p,0)} %`:`Omkring ${fmt(p,0)}. percentil`;
    const mine=latestValid("soh_percent");
    box.innerHTML=`<div class="percentile-chart"><p class="percentile-title">SoH-placering blandt ${Number(data.sample_size).toLocaleString("da-DK")} sammenlignelige biler</p><div class="percentile-band"><span class="percentile-segment" style="left:25%;width:50%"></span><span class="percentile-median" style="left:50%"></span><span class="percentile-dot" style="left:${p}%" title="Din bil: ${fmt(p,0)}. percentil"></span>${mine!==null?`<span class="percentile-current-label" style="left:${p}%">Din bil ${fmt(mine,1)} %</span>`:""}</div><div class="percentile-axis"><span>Lavere</span><span>Median</span><span>Højere</span></div><div class="percentile-result"><div><small>Placering</small><strong>${esc(rank)}</strong></div><div><small>Flådens SoH-median</small><b>${fmt(median,1)} %</b><small>Midterste 50 %: ${fmt(low,1)}–${fmt(high,1)} %</small></div></div></div>`;
  }
  async function loadBenchmark() {
    currentBenchmark=null;
    if(!sb||!currentVehicle||!currentRecords.some(r=>num(r.soh_percent)>0)) {renderBenchmark();return;}
    const canonical=resolveFactoryBattery({...inferBatteryProfile(currentVehicle),trim:currentVehicle.trim_level});
    if (Math.abs(Number(currentVehicle.battery_nominal_kwh)-canonical)>.2) {
      console.warn("EV Pulse: gammel Supabase-profil har forkert fabriksbatteri; ret under Min bil før flådesammenligning.");
      renderBenchmark();return;
    }
    try {
      const {data,error}=await sb.rpc("get_soh_benchmark",{p_vehicle_id:currentVehicle.id,p_km_window:25000});
      if(error)throw error;
      currentBenchmark=Array.isArray(data)?data[0]||null:data||null;
    } catch(err){console.warn("EV Pulse: benchmark not available:",err?.message||err)}
    renderBenchmark();renderSohChart();
  }

  function renderFingerprint() {
    const box=q('fingerprintChart');
    if (!box) return;
    const records=currentRecords;
    if (!records.length) {
      box.innerHTML='<div class="empty-state">Ingen målinger til at beregne datadækning.</div>';
      q('fingerprintCaption').textContent='Datadækning kræver faktiske målinger fra Supabase.';
      return;
    }
    // Measurement completeness is NOT a battery condition score. Each count
    // is based on different calendar days, so dense OBD polling on a single
    // drive cannot create artificial confidence in the evidence.
    const bins=Array.from({length:5},()=>new Set());
    const allDays=new Set(), sohDays=new Set(), cellDays=new Set(), tempDays=new Set();
    const validSoc=v=>v!==null && v>=0 && v<=100;
    const validTemp=v=>v!==null && v>=-45 && v<=100;
    for(const rec of records){
      const day=measurementDayKey(rec.recorded_at);
      if(!day) continue;
      allDays.add(day);
      const soc=num(rec.soc_display_percent);
      if(validSoc(soc)) bins[Math.min(4,Math.floor(soc/20))].add(day);
      if(num(rec.soh_percent)!==null && num(rec.soh_percent)>0 && num(rec.soh_percent)<=100) sohDays.add(day);
      if(num(rec.cell_delta_mv)!==null && num(rec.cell_delta_mv)>=0 && num(rec.cell_delta_mv)<=5000) cellDays.add(day);
      const avg=num(rec.battery_temp_avg_c), low=num(rec.battery_temp_min_c), high=num(rec.battery_temp_max_c);
      if(validTemp(avg)||(validTemp(low)&&validTemp(high)&&low<=high))tempDays.add(day);
    }
    const fullReference=records.some(rec=>
      rec.record_type==='FULL_CHARGE_REFERENCE' &&
      num(rec.remaining_energy_kwh)!==null && num(rec.remaining_energy_kwh)>0 &&
      num(rec.soc_display_percent)!==null && num(rec.soc_display_percent)>=99
    );
    const days=Math.max(1,allDays.size);
    // Five evidence-coverage dimensions: presence of actual readings, not
    // whether reported cell voltage or temperatures are objectively 'healthy'.
    const adequatelyCovered=bins.filter(b=>b.size>=2).length;
    const values=[sohDays.size/days,cellDays.size/days,tempDays.size/days,fullReference?1:null,adequatelyCovered/5];
    const names=['SoH-data','Celledata','Temp.data','Energi-ref.','SoC-dækning'];
    const cx=163,cy=67,r=43;
    const point=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/5;return [cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v]};
    const poly=v=>Array.from({length:5},(_,i)=>point(i,v).map(n=>n.toFixed(2)).join(',')).join(' ');
    // Missing references are shown as a separate gray hollow marker, not as
    // evidence of poor battery health. The polygon represents DATA completeness.
    const shape=values.map((v,i)=>point(i,v??0).map(n=>n.toFixed(2)).join(',')).join(' ');
    const axes=names.map((_,i)=>{const [x,y]=point(i,1);return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#80a4c5" stroke-opacity=".30"/>`}).join('');
    const labels=names.map((name,i)=>{const [x,y]=point(i,1.44);return `<text x="${x.toFixed(1)}" y="${(y+3).toFixed(1)}" font-size="10.3" fill="#cedfe9" text-anchor="middle">${name}</text>`}).join('');
    const vertices=values.map((v,i)=>{const [x,y]=point(i,v??0);return v===null?`<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#91a7b7" stroke-dasharray="2 2" stroke-width="1.6"><title>Fuldladningsreference mangler</title></circle>`:`<circle cx="${x}" cy="${y}" r="2.8" fill="#6fc4f6"><title>${names[i]}: ${Math.round(v*100)} % af datagrundlaget</title></circle>`}).join('');
    const radar=`<svg viewBox="0 0 326 132" role="img" aria-label="Dækning af faktiske SoH-, celle- og temperaturmålinger samt fuldladningsreference og SoC-områder"><polygon points="${poly(.33)}" stroke="#6889a6" stroke-opacity=".23" fill="none"/><polygon points="${poly(.66)}" stroke="#6889a6" stroke-opacity=".30" fill="none"/><polygon points="${poly(1)}" stroke="#6889a6" stroke-opacity=".45" fill="none"/>${axes}<polygon points="${shape}" fill="#2274ce" fill-opacity=".22" stroke="#57b5ef" stroke-width="1.8"/>${vertices}${labels}</svg>`;
    const socRanges=['0–19 %','20–39 %','40–59 %','60–79 %','80–100 %'];
    const segments=bins.map((set,i)=>{
      const n=set.size,cls=n>=2?'adequate':n===1?'limited':'absent';
      const explanation=n===0?'Ingen måledage':n===1?'Kun én måledag':`${n} forskellige måledage`;
      return `<div class="soc-band ${cls}" title="${socRanges[i]} SoC: ${explanation}"><span>${socRanges[i]}</span><i aria-hidden="true"></i><small>${n} ${n===1?'dag':'dage'}</small></div>`;
    }).join('');
    box.innerHTML=`<div class="fingerprint-radar">${radar}</div><div class="soc-coverage" role="group" aria-label="Måledækning ved fem batteriniveauer">${segments}</div>`;
    q('fingerprintCaption').textContent=`Måledækning: ${adequatelyCovered}/5 SoC-områder (min. 2 måledage). ${fullReference?'100 %-energireference fundet.':'100 %-energireference mangler.'} Ikke batteriets helbredsscore.`;
  }

  function recordLabel(type) {
    return ({FULL_CHARGE_REFERENCE:"100 % reference",LOW_SOC_REFERENCE:"Lav-SoC reference",REST_CHANGE:"Hvileændring",UNOBSERVED_DRIVING:"Kørsel mellem målinger",WAKE:"Wake",OBSERVATION:"Observation"})[type] || type || "Observation";
  }

  function renderEvidenceList() {
    const box=q('evidenceList');
    const all=currentRecords.filter(r=>measurementDayKey(r.recorded_at));
    // Six different measurement days, not six OBD polls from the same drive.
    // Choose the latest actual database row per day. No values are averaged,
    // interpolated or changed, and the full imported history remains intact.
    const days=lastPerMeasurementDay(all).reverse();
    const rows=days.slice(0,6);
    if(!rows.length){box.innerHTML='<div class="empty-state">Ingen målinger endnu.</div>';return}
    const dayCounts=new Map();
    all.forEach(r=>{const day=measurementDayKey(r.recorded_at);dayCounts.set(day,(dayCounts.get(day)||0)+1)});
    box.innerHTML=`<table class="evidence-table"><thead><tr><th>Dato</th><th>Kilometer</th><th>SoC</th><th>Temperatur</th><th>Cellebalance</th><th>Kilde</th></tr></thead><tbody>${rows.map(r=>{
      const t=num(r.battery_temp_avg_c) ?? ((num(r.battery_temp_min_c)!==null&&num(r.battery_temp_max_c)!==null)?(num(r.battery_temp_min_c)+num(r.battery_temp_max_c))/2:null);
      const count=dayCounts.get(measurementDayKey(r.recorded_at))||1;
      return `<tr title="Seneste registrering ${esc(dateFmt(r.recorded_at))} · ${count} målinger denne dag"><td>${esc(dateFmt(r.recorded_at).split(',')[0])}</td><td>${num(r.odometer_km)!==null?Math.round(r.odometer_km).toLocaleString('da-DK'):'—'}</td><td>${fmt(r.soc_display_percent,0)} %</td><td>${t===null?'—':`${fmt(t,0)} °C`}</td><td>${num(r.cell_delta_mv)===null?'—':`${fmt(r.cell_delta_mv,0)} mV`}</td><td>${esc(r.source_app_version?.includes('csv')?'CSV':r.source_app_version?.includes('obd')?'OBD':'Ukendt')}</td></tr>`;
    }).join('')}</tbody></table><div class="measurement-day-info">Nyeste måling pr. dag · ${days.length} måledage · ${all.length} registreringer i Supabase</div>`;
  }

  async function createVehicleFromForm(form) {
    const fd=new FormData(form);
    const defaultPaint=paintByCode("KLM");
    const payload={
      anon_vehicle_id:crypto.randomUUID(),
      platform:String(fd.get("platform")||"E-GMP").trim(),
      manufacturer:String(fd.get("manufacturer")||"").trim(),
      model:String(fd.get("model")||"").trim(),
      variant:String(fd.get("trim_level")) === "GT Performance" ? "AWD" : String(fd.get("variant")||"RWD").trim(),
      model_year:num(fd.get("model_year")),
      battery_nominal_kwh:formProfile(form).capacity,
      trim_level:EV6_TRIMS[String(fd.get("trim_level"))] ? String(fd.get("trim_level")) : "Standard",
      exterior_color_code:defaultPaint.code,
      exterior_color_name:defaultPaint.name
    };
    if (payload.trim_level==="GT Performance" && payload.variant!=="AWD") throw new Error("GT Performance kræver AWD.");
    const {data,error}=await sb.from("vehicles").insert(payload).select("*").single();
    if(error)throw error;
    currentVehicle=data;renderVehicleState();await loadRecords();
  }

  async function updateVehicleFromForm(form) {
    const fd=new FormData(form);
    const colorCode=String(fd.get("exterior_color_code")||"KLM");
    const paint=paintByCode(colorCode);
    const trim = String(fd.get("trim_level")||"GT-Line");
    const drive = String(fd.get("variant")||"RWD");
    if (trim === "GT Performance" && drive !== "AWD") {
      throw new Error("EV6 GT (Performance) har AWD. Vælg AWD som drivlinje.");
    }
    const payload={
      platform:String(fd.get("platform")||"").trim(),
      manufacturer:String(fd.get("manufacturer")||"").trim(),
      model:String(fd.get("model")||"").trim(),
      variant:drive,
      model_year:num(fd.get("model_year")),
      battery_nominal_kwh:formProfile(form).capacity,
      trim_level:EV6_TRIMS[trim] ? trim : "GT-Line",
      exterior_color_code:paint.code,
      exterior_color_name:paint.name,
      updated_at:new Date().toISOString()
    };
    const {data,error}=await sb.from("vehicles").update(payload)
      .eq("id",currentVehicle.id).eq("owner_user_id",sessionUser.id)
      .select("*").single();
    if(error)throw error;
    currentVehicle=data;renderVehicleState();renderDashboard();await loadBenchmark();
  }

  function renderPreview() {
    const mapped=parsedRows.slice(0,5);
    q("previewCount").textContent=`${parsedRows.length} records fundet`;
    q("previewContent").innerHTML=`<table><thead><tr><th>Type</th><th>Km</th><th>SoC</th><th>SoH</th><th>Remaining</th><th>Delta</th></tr></thead><tbody>${mapped.map(r=>`<tr><td>${esc(r.type)}</td><td>${esc(r.odometer_km)}</td><td>${esc(r.soc_percent)}%</td><td>${esc(r.soh_percent)}%</td><td>${esc(r.remaining_kwh)} kWh</td><td>${esc(r.cell_delta_mv)} mV</td></tr>`).join("")}</tbody></table>`;
    q("previewBox").classList.remove("hidden");
  }

  async function uploadRows() {
    if(!currentVehicle){setMessage(q("uploadMessage"),"Opret bilprofilen først.","error");return}
    const payload=parsedRows.map(mapRow).filter(r=>r.recorded_at&&r.record_type&&r.client_record_id);
    if(!payload.length){setMessage(q("uploadMessage"),"CSV-filen indeholder ingen gyldige Battery Evidence-records.","error");return}
    q("uploadButton").disabled=true;setMessage(q("uploadMessage"),`Uploader ${payload.length} records…`);
    try{
      for(let i=0;i<payload.length;i+=250){
        const batch=payload.slice(i,i+250);
        const {error}=await sb.from("battery_records").upsert(batch,{onConflict:"vehicle_id,client_record_id",ignoreDuplicates:true});
        if(error)throw error;
        setMessage(q("uploadMessage"),`Uploader… ${Math.min(i+batch.length,payload.length)} / ${payload.length}`);
      }
      setMessage(q("uploadMessage"),`Færdig. ${payload.length} records behandlet; dubletter ignoreres automatisk.`,"success");
      await loadRecords();switchView("overview");
    }catch(err){console.error(err);setMessage(q("uploadMessage"),`Upload fejlede: ${err.message||err}`,"error")}
    finally{q("uploadButton").disabled=false}
  }

  function switchView(name) {
    const targets={battery:"batterySummary",history:"historyPanel",compare:"comparePanel",fingerprint:"fingerprintPanel"};
    const actual = ["upload","vehicle"].includes(name)?name:"overview";
    ["overview","upload","vehicle"].forEach(v=>q(v+"View").classList.toggle("hidden",v!==actual));
    document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===name));
    if(targets[name]) requestAnimationFrame(()=>q(targets[name])?.scrollIntoView({behavior:"smooth",block:"center"}));
    if(actual==='overview')requestAnimationFrame(renderSohChart);
    window.scrollTo({top:0,behavior:name==="overview"?"smooth":"instant"});
  }
  function exportOwnCsv() {
    if(!currentRecords.length) {window.alert("Der er endnu ingen målinger at eksportere.");return}
    const fields=["recorded_at","odometer_km","record_type","soh_percent","soc_display_percent","remaining_energy_kwh","cell_delta_mv","battery_temp_avg_c","battery_temp_min_c","battery_temp_max_c"];
    const csv=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const text=[fields.join(","),...currentRecords.map(r=>fields.map(f=>csv(r[f])).join(","))].join("\r\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF",text],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="EVPulse_mine_batterimaalinger.csv";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function bindUi() {
    document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));
    q("headerDataButton")?.addEventListener("click",()=>switchView("upload"));
    q("headerSettingsButton")?.addEventListener("click",()=>switchView("vehicle"));
    q("quickUpload")?.addEventListener("click",()=>switchView("upload"));
    q("quickHistory")?.addEventListener("click",()=>switchView("history"));
    q("quickCompare")?.addEventListener("click",()=>switchView("compare"));
    q("quickExport")?.addEventListener("click",exportOwnCsv);
    q("chartPeriod")?.addEventListener("change",renderSohChart);
    q("chartXAxis")?.addEventListener("change",renderSohChart);
    // Recalculate SVG at its real display size; never distort the viewBox.
    let lastChartWidth=0;
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(entries=>{
        const width=Math.round(entries[0]?.contentRect?.width||0);
        if(width>0 && width!==lastChartWidth){lastChartWidth=width;renderSohChart()}
      }).observe(q('sohChart'));
    } else {
      window.addEventListener('resize',renderSohChart,{passive:true});
    }
    q("editVehicleFromHero").addEventListener("click",()=>switchView("vehicle"));

    q("vehicleForm").addEventListener("submit",async e=>{
      e.preventDefault();setMessage(q("vehicleFormMessage"),"Gemmer…");
      try{await createVehicleFromForm(e.currentTarget);setMessage(q("vehicleFormMessage"),"Bilprofil gemt.","success")}
      catch(err){setMessage(q("vehicleFormMessage"),err.message||String(err),"error")}
    });
    q("vehicleForm").addEventListener("change",e=>{
      const form=q("vehicleForm");
      if(e.target.name === "model_year") defaultGenerationForChangedYear(form);
      if(form.elements.namedItem("trim_level")?.value==="GT Performance")form.elements.namedItem("variant").value="AWD";
      syncVehicleFactoryProfile(form);
    });
    q("vehicleForm").addEventListener("input",e=>{
      if(e.target.name !== "model_year")return;
      defaultGenerationForChangedYear(e.currentTarget);
      syncVehicleFactoryProfile(e.currentTarget);
    });
    q("vehicleEditForm").addEventListener("submit",async e=>{
      e.preventDefault();setMessage(q("vehicleEditMessage"),"Gemmer…");
      try{await updateVehicleFromForm(e.currentTarget);setMessage(q("vehicleEditMessage"),"Ændringer gemt.","success")}
      catch(err){setMessage(q("vehicleEditMessage"),err.message||String(err),"error")}
    });
    q("vehicleEditForm").addEventListener("click",e=>{
      const btn=e.target.closest(".paint-swatch");if(!btn)return;
      const form=q("vehicleEditForm");form.elements.namedItem("exterior_color_code").value=btn.dataset.paint;
      renderPaintSwatches(form);refreshVehiclePreview();
    });
    q("vehicleEditForm").addEventListener("change",e=>{
      const form=q("vehicleEditForm");
      if(e.target.name === "model_year") defaultGenerationForChangedYear(form);
      if(e.target.name==="trim_level" && e.target.value==="GT Performance") {
        form.elements.namedItem("variant").value="AWD";
        form.elements.namedItem("battery_pack").value="long";
      }
      syncVehicleFactoryProfile(form);
      refreshVehiclePreview();
    });
    q("vehicleEditForm").addEventListener("input",e=>{
      if(e.target.name !== "model_year")return;
      const form=e.currentTarget;
      defaultGenerationForChangedYear(form);
      syncVehicleFactoryProfile(form);
      refreshVehiclePreview();
    });

    const fileInput=q("csvFile");
    const handleFile=async file=>{
      q("fileLabel").textContent=file?file.name:"Ingen fil valgt";q("uploadButton").disabled=!file;q("previewButton").disabled=!file;q("previewBox").classList.add("hidden");parsedRows=[];
      if(file){try{parsedRows=parseCsv(await file.text());const required=["timestamp","type","odometer_km","soc_percent","soh_percent","remaining_kwh"];const headers=parsedRows[0]?Object.keys(parsedRows[0]):[];const missing=required.filter(h=>!headers.includes(h));if(missing.length){setMessage(q("uploadMessage"),`CSV genkendes ikke. Mangler: ${missing.join(", ")}`,"error");q("uploadButton").disabled=true;q("previewButton").disabled=true}else setMessage(q("uploadMessage"),`${parsedRows.length} Battery Evidence-records fundet.`,"success")}catch(err){setMessage(q("uploadMessage"),`Kunne ikke læse CSV: ${err.message||err}`,"error")}}
    };
    fileInput.addEventListener("change",()=>handleFile(fileInput.files?.[0]||null));
    const dz=q("dropzone");["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("dragover")}));["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("dragover")}));dz.addEventListener("drop",e=>{const f=e.dataTransfer?.files?.[0];if(f)handleFile(f)});
    q("previewButton").addEventListener("click",renderPreview);q("uploadButton").addEventListener("click",uploadRows);
  }

  async function init() {
    bindUi();
    try{
      if(!cfg?.SUPABASE_URL||!cfg?.SUPABASE_PUBLISHABLE_KEY)throw new Error("Supabase config mangler.");
      sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      sessionUser=await ensureAnonymousSession();
      setOnline(false,"Indlæser fra Supabase…");
      q("sideMeta").textContent="Indlæser kun databaseposter…";
      await loadVehicle();await loadRecords();
      setOnline(true,"Forbundet");
      q("sideMeta").textContent=currentRecords.length
        ? `Supabase · ${currentRecords.length.toLocaleString("da-DK")} registreringer\nSenest ${dateFmt(currentRecords.at(-1)?.recorded_at)}`
        : "Supabase · Ingen målinger for denne bil";
    }catch(err){
      console.error(err);
      // Never leave previously loaded or local/example values on screen after a read failure.
      currentVehicle=null;currentRecords=[];currentBenchmark=null;
      renderVehicleState();renderDashboard();
      setOnline(false,"Forbindelsesfejl");
      q("sideMeta").textContent="Supabase kunne ikke indlæses: "+(err.message||String(err));
      q("heroInsight").textContent="Ingen data vist: Supabase-forbindelsen fejlede.";
    }
  }

  init();
})();