(() => {
  console.info("EV Pulse Benchmark v0.8 · car identity in Min bil");
  const cfg = window.EVPULSE_CONFIG;
  let sb = null;
  let sessionUser = null;
  let currentVehicle = null;
  let currentRecords = [];
  let parsedRows = [];

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
    return d.toLocaleString("da-DK", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" });
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
    const { data, error } = await sb.from("vehicles").select("*").order("created_at", { ascending: true }).limit(1);
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
    refreshVehiclePreview();
  }

  function vehicleEditMarkup() {
    if (!currentVehicle) return '<div class="empty-state">Opret først bilprofilen.</div>';
    const trim = EV6_TRIMS[currentVehicle.trim_level] ? currentVehicle.trim_level : "GT-Line";
    const color = currentVehicle.exterior_color_code || "KLM";
    const variant = currentVehicle.variant || "RWD";
    const paint = paintByCode(color);
    return `
      <div class="vehicle-form-section"><div class="eyebrow">BILIDENTITET</div><h3>Model og drivlinje</h3>
      <div class="vehicle-fields">
        <label>Mærke<input name="manufacturer" value="${esc(currentVehicle.manufacturer || "")}" required></label>
        <label>Model<input name="model" value="${esc(currentVehicle.model || "")}" required></label>
        <label>Modelår<input name="model_year" type="number" min="2018" max="2035" value="${esc(currentVehicle.model_year || "")}"></label>
        <label>Drivlinje<select name="variant">
          <option value="RWD" ${variant === "RWD" ? "selected" : ""}>RWD · Baghjulstræk</option>
          <option value="AWD" ${variant === "AWD" ? "selected" : ""}>AWD · Firehjulstræk</option>
        </select></label>
        <label>Batteri, kWh<input name="battery_nominal_kwh" type="number" step="0.1" min="1" value="${esc(currentVehicle.battery_nominal_kwh || "")}"></label>
        <label>Platform<input name="platform" value="${esc(currentVehicle.platform || "E-GMP")}" required></label>
      </div></div>
      <div class="vehicle-form-section"><div class="eyebrow">KIA EV6</div><h3>Udstyrsvariant</h3>
        <div class="trim-options" role="group" aria-label="Vælg udstyrsvariant">
          ${Object.entries(EV6_TRIMS).map(([key,data]) => `<label class="trim-card">
             <input type="radio" name="trim_level" value="${key}" ${key===trim?"checked":""}>
             <span>${esc(data.label)}</span></label>`).join("")}
        </div>
        <p class="vehicle-settings-hint">Drivlinje og udstyrsvariant er forskellige. GT (Performance) har AWD.</p>
      </div>
      <div class="vehicle-form-section"><div class="eyebrow">KARROSSERI</div><h3>Original Kia-farve</h3>
        <input type="hidden" name="exterior_color_code" value="${esc(paint.code)}">
        <div class="vehicle-color-row"><div id="vehiclePaintSwatches" class="paint-swatches"></div><span id="vehiclePaintName" class="paint-name">${esc(paint.name)}</span></div>
        <p class="vehicle-settings-hint">Viste lakfarver er skærmtilnærmelser. Tilgængelighed afhænger af årgang, marked og udgave.</p>
      </div>
      <div class="vehicle-save-row"><button class="primary-btn" type="submit">Gem bilprofil</button><span>Farve og variant gemmes på din bil i Supabase.</span></div>`;
  }

  function renderVehicleState() {
    const setup = q("setupPanel");
    if (!currentVehicle) {
      setup.classList.remove("hidden");
      q("vehicleLine").textContent = "Ingen bilprofil endnu";
      q("vehicleChip").textContent = "EV Pulse";
      q("vehicleEditForm").innerHTML = '<div class="empty-state">Opret først bilprofilen øverst.</div>';
      applyVehicleVisual();
      return;
    }
    setup.classList.add("hidden");
    const vehicleName = [currentVehicle.manufacturer, currentVehicle.model].filter(Boolean).join(" ");
    const detailLine = [currentVehicle.model_year, currentVehicle.variant, displayTrim(currentVehicle.trim_level || "GT-Line")].filter(Boolean).join(" · ") +
      (currentVehicle.battery_nominal_kwh ? ` · ${String(currentVehicle.battery_nominal_kwh).replace(".", ",")} kWh` : "");
    q("vehicleChip").textContent = vehicleName || "EV";
    q("vehicleLine").textContent = detailLine || vehicleName || "Bilprofil";
    q("sideVehicle").textContent = vehicleName || "EV Pulse Cloud";
    q("vehicleEditForm").innerHTML = vehicleEditMarkup();
    renderPaintSwatches(q("vehicleEditForm"));
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
    const full = records.filter(r => r.record_type === "FULL_CHARGE_REFERENCE" && Number(r.remaining_energy_kwh) > 0);
    const latestFull = full.at(-1);
    const latestDeltaRecord = [...records].reverse().find(r => Number(r.cell_delta_mv) >= 0 && r.cell_delta_mv !== null);

    q("heroSoh").textContent = latestSoh !== null ? fmt(latestSoh, 1) : "—";
    q("metricSoh").textContent = latestSoh !== null ? `${fmt(latestSoh,1)} %` : "—";
    q("metricSohMeta").textContent = records.length ? `${records.filter(r => Number(r.soh_percent)>0).length} SoH-observationer` : "Ingen målinger";
    q("metricEnergy").textContent = latestFull ? `${fmt(latestFull.remaining_energy_kwh,2)} kWh` : "—";
    q("metricEnergyMeta").textContent = latestFull ? `Senest ${dateFmt(latestFull.recorded_at)}` : "Kræver 100 % reference";
    q("metricDelta").textContent = latestDeltaRecord ? `${fmt(latestDeltaRecord.cell_delta_mv,0)} mV` : "—";
    q("metricDeltaMeta").textContent = latestDeltaRecord ? `${fmt(latestDeltaRecord.soc_display_percent,1)} % SoC · kanal #${latestDeltaRecord.min_cell_number || "—"} lavest` : "Ingen målinger";
    q("metricRecords").textContent = records.length.toLocaleString("da-DK");
    q("metricRecordsMeta").textContent = `${full.length} fulde referencer`;
    q("heroInsight").textContent = records.length ? `${records.length} batteriregistreringer · senest ${dateFmt(records.at(-1)?.recorded_at)}` : "Upload batterihistorik for at bygge tidslinjen.";
    if (records.length) q("sideMeta").textContent = `Seneste data\n${dateFmt(records.at(-1)?.recorded_at)}`;
    renderSohChart();
    renderEvidenceList();
  }

  function renderSohChart() {
    const chart = q("sohChart");
    const raw = currentRecords.filter(r => Number(r.soh_percent) > 0 && Number(r.odometer_km) >= 0)
      .map(r => ({ x:Number(r.odometer_km), y:Number(r.soh_percent), date:r.recorded_at }));
    const byKey = new Map();
    raw.forEach(p => byKey.set(`${p.x}|${p.y}`, p));
    const pts = [...byKey.values()].sort((a,b) => a.x - b.x);
    if (!pts.length) { chart.innerHTML = '<div class="empty-state">Ingen SoH-data endnu.</div>'; return; }

    const w=1200,h=210,padL=58,padR=28,padT=20,padB=38;
    let minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x));
    let minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
    if(maxX===minX){minX-=1000;maxX+=1000}
    minY=Math.min(100,Math.floor((minY-1.5)*2)/2);maxY=Math.max(100,Math.ceil((maxY+.5)*2)/2);if(maxY-minY<3)minY=maxY-3;
    const sx=x=>padL+(x-minX)/(maxX-minX)*(w-padL-padR),sy=y=>padT+(maxY-y)/(maxY-minY)*(h-padT-padB);
    const line=pts.map((p,i)=>`${i?"L":"M"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
    let grids="",labels="";
    for(let i=0;i<=4;i++){const yv=minY+(maxY-minY)*i/4,yy=sy(yv);grids+=`<line x1="${padL}" x2="${w-padR}" y1="${yy}" y2="${yy}" stroke="rgba(176,186,200,.10)"/>`;labels+=`<text x="${padL-12}" y="${yy+4}" text-anchor="end" fill="#738091" font-size="11">${yv.toFixed(1)}%</text>`}
    for(let i=0;i<=4;i++){const xv=minX+(maxX-minX)*i/4,xx=sx(xv);grids+=`<line y1="${padT}" y2="${h-padB}" x1="${xx}" x2="${xx}" stroke="rgba(176,186,200,.07)"/>`;labels+=`<text x="${xx}" y="${h-15}" text-anchor="middle" fill="#738091" font-size="11">${Math.round(xv).toLocaleString("da-DK")} km</text>`}
    const circles=pts.map(p=>`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="5" fill="#A7D9C4" stroke="#111720" stroke-width="3"><title>${fmt(p.y,1)} % · ${Math.round(p.x).toLocaleString("da-DK")} km · ${dateFmt(p.date)}</title></circle>`).join("");
    const area=`${line} L ${sx(pts.at(-1).x).toFixed(1)} ${h-padB} L ${sx(pts[0].x).toFixed(1)} ${h-padB} Z`;
    chart.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="SoH over kilometer">
      <defs><linearGradient id="sohFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#62E2BA" stop-opacity=".17"/><stop offset="100%" stop-color="#62E2BA" stop-opacity="0"/></linearGradient></defs>
      ${grids}${labels}<path d="${area}" fill="url(#sohFill)"/><path d="${line}" fill="none" stroke="#62E2BA" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}
    </svg>`;
  }

  function recordLabel(type) {
    return ({FULL_CHARGE_REFERENCE:"100 % reference",LOW_SOC_REFERENCE:"Lav-SoC reference",REST_CHANGE:"Hvileændring",UNOBSERVED_DRIVING:"Kørsel mellem målinger",WAKE:"Wake",OBSERVATION:"Observation"})[type] || type || "Observation";
  }

  function renderEvidenceList() {
    const box=q("evidenceList"),rows=[...currentRecords].reverse().slice(0,8);
    if(!rows.length){box.innerHTML='<div class="empty-state">Ingen records endnu.</div>';return}
    const tagClass=t=>t==="LOW_SOC_REFERENCE"?"evidence-tag low":"evidence-tag";
    box.innerHTML=`<table class="evidence-table"><thead><tr><th>Type</th><th>SoH</th><th>SoC</th><th>Energi</th><th>Temperatur</th><th>Kilometer</th><th>Dato</th></tr></thead><tbody>${rows.map(r=>{
      const avg=Number(r.battery_temp_avg_c);const t=Number.isFinite(avg)?`${fmt(avg,0)} °C`:(Number.isFinite(Number(r.battery_temp_min_c))?`${fmt(r.battery_temp_min_c,0)}–${fmt(r.battery_temp_max_c,0)} °C`:"—");
      return `<tr><td><span class="${tagClass(r.record_type)}">${esc(recordLabel(r.record_type))}</span></td><td class="evidence-soh">${fmt(r.soh_percent,1)} %</td><td>${fmt(r.soc_display_percent,1)} %</td><td>${fmt(r.remaining_energy_kwh,2)} kWh</td><td>${t}</td><td>${r.odometer_km?Math.round(r.odometer_km).toLocaleString("da-DK")+" km":"—"}</td><td>${dateFmt(r.recorded_at)}</td></tr>`}).join("")}</tbody></table>`;
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
      battery_nominal_kwh:num(fd.get("battery_nominal_kwh")),
      trim_level:EV6_TRIMS[String(fd.get("trim_level"))] ? String(fd.get("trim_level")) : "Standard",
      exterior_color_code:defaultPaint.code,
      exterior_color_name:defaultPaint.name
    };
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
      battery_nominal_kwh:num(fd.get("battery_nominal_kwh")),
      trim_level:EV6_TRIMS[trim] ? trim : "GT-Line",
      exterior_color_code:paint.code,
      exterior_color_name:paint.name,
      updated_at:new Date().toISOString()
    };
    const {data,error}=await sb.from("vehicles").update(payload).eq("id",currentVehicle.id).select("*").single();
    if(error)throw error;
    currentVehicle=data;renderVehicleState();
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
    ["overview","upload","vehicle"].forEach(v=>q(v+"View").classList.toggle("hidden",v!==name));
    document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===name));
  }

  function bindUi() {
    document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));

    q("vehicleForm").addEventListener("submit",async e=>{
      e.preventDefault();setMessage(q("vehicleFormMessage"),"Gemmer…");
      try{await createVehicleFromForm(e.currentTarget);setMessage(q("vehicleFormMessage"),"Bilprofil gemt.","success")}
      catch(err){setMessage(q("vehicleFormMessage"),err.message||String(err),"error")}
    });

    q("vehicleEditForm").addEventListener("submit",async e=>{
      e.preventDefault();setMessage(q("vehicleEditMessage"),"Gemmer…");
      try{await updateVehicleFromForm(e.currentTarget);setMessage(q("vehicleEditMessage"),"Ændringer gemt.","success")}
      catch(err){setMessage(q("vehicleEditMessage"),err.message||String(err),"error")}
    });

    q("editVehicleFromHero").addEventListener("click", () => switchView("vehicle"));

    q("vehicleEditForm").addEventListener("click", e => {
      const btn = e.target.closest(".paint-swatch");
      if (!btn) return;
      const form = q("vehicleEditForm");
      form.elements.namedItem("exterior_color_code").value = btn.dataset.paint;
      renderPaintSwatches(form);
      refreshVehiclePreview();
    });

    q("vehicleEditForm").addEventListener("change", e => {
      if (e.target.name === "trim_level") {
        const form = q("vehicleEditForm");
        if (e.target.value === "GT Performance") form.elements.namedItem("variant").value = "AWD";
        refreshVehiclePreview();
      }
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
      q("sideMeta").textContent="Anonym session · "+sessionUser.id.slice(0,8);
      setOnline(true,"Forbundet");
      await loadVehicle();await loadRecords();
    }catch(err){
      console.error(err);setOnline(false,"Forbindelsesfejl");q("sideMeta").textContent=err.message||String(err);q("heroInsight").textContent="Kunne ikke forbinde til Supabase.";
    }
  }

  init();
})();