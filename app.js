(() => {
  console.info("EV Pulse Benchmark v1.0.0 · Battery Intelligence");
  const cfg = window.EVPULSE_CONFIG;
  let sb = null;
  let sessionUser = null;
  let currentVehicle = null;
  let currentRecords = [];
  let parsedRows = [];
  let currentBenchmark = null;
  const Catalog=window.EVPulseCatalog;
  const Intelligence=window.EVPulseIntelligence;
  let currentAnalysis=null;

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
    const specific=Catalog?.get(vehicle?.catalog_variant_key);
    if(specific)return {generation:specific.generation,pack:specific.pack};
    // Legacy *read-only* bridge. The catalogue must be confirmed when saving.
    const year=num(vehicle?.model_year),gross=num(vehicle?.battery_nominal_kwh);
    const pack=gross!==null && [58,62.9,63].some(x=>Math.abs(x-gross)<.2)?'standard':'long';
    const generation=year!==null&&year<2025?'original':
      gross!==null&&[58,77.4].some(x=>Math.abs(x-gross)<.2)?'original':'facelift';
    return {generation,pack};
  }
  function resolveFactoryBattery({generation,pack,trim}) {
    const entry=Catalog?.find({generation,pack,trim})?.[0]||Catalog?.find({generation,pack})?.[0];
    return entry?entry.kwh:null;
  }
  function formVariant(form) {
    if(!form)return null;
    const field=form.elements.namedItem('catalog_variant_key');
    const key=field?.value||'';
    const row=Catalog.get(key);
    const year=num(form.elements.namedItem('model_year')?.value);
    if(!row||!row.years.includes(year)||row.generation!==form.elements.namedItem('generation')?.value||
      row.pack!==form.elements.namedItem('battery_pack')?.value||row.drive!==form.elements.namedItem('variant')?.value||
      row.trim!==form.elements.namedItem('trim_level')?.value)return null;
    return row;
  }
  function formProfile(form) {
    const row=formVariant(form);
    return {trim:row?.trim||'Standard',generation:row?.generation||'original',
      pack:row?.pack||'long',capacity:row?.kwh??null};
  }
  function catalogFormMarkup(vehicle) {
    const legacy=Catalog.fromLegacy(vehicle);
    const initial=Catalog.get(vehicle?.catalog_variant_key)||legacy;
    const year=vehicle?.model_year||2023;
    return `<div class="vehicle-form-section"><div class="eyebrow">VERIFICERET BILKATALOG</div><h3>Vælg din bil</h3>
      <div class="vehicle-fields ev-catalog-fields">
        <label>Mærke<select name="manufacturer" required><option value="Kia">Kia</option></select></label>
        <label>Model<select name="model" required><option value="EV6">EV6</option></select></label>
        <label>Modelår<select name="model_year" required>${Catalog.modelYears().map(y=>`<option value="${y}" ${+year===y?'selected':''}>${y}</option>`).join('')}</select></label>
        <label>Generation<select name="generation" required data-catalog-default="${esc(initial?.generation||'')}"></select></label>
        <label>Batterivariant<select name="battery_pack" required data-catalog-default="${esc(initial?.pack||'')}"></select></label>
        <label>Drivlinje<select name="variant" required data-catalog-default="${esc(initial?.drive||'')}"></select></label>
        <label>Udstyrsvariant<select name="trim_level" required data-catalog-default="${esc(initial?.trim||'')}"></select></label>
        <label>Fabriksbatteri <small>(låst)</small><input name="battery_nominal_kwh" readonly tabindex="-1" value=""></label>
        <label>Platform <small>(låst)</small><input name="platform" readonly tabindex="-1" value="E-GMP"></label>
        <input type="hidden" name="catalog_variant_key" value="">
      </div>
      <p class="vehicle-settings-hint" data-profile-year-note>Vælg alle felter. Batterikapaciteten bestemmes automatisk af den valgte fabriksvariant.</p>
      <p class="catalog-source-note">Tekniske data fra Kia Danmark. Kataloget omfatter indtil videre validerede EV6-kombinationer; øvrige mærker tilføjes efter verificering. 2025 kræver eksplicit generation.</p>
    </div>`;
  }
  const selectOpt=(value,label)=>`<option value="${esc(value)}">${esc(label)}</option>`;
  function catalogSelect(field,options,preferred,placeholder='Vælg…'){
    const el=field;if(!el)return '';
    const values=options.map(x=>typeof x==='string'?{value:x,label:x}:x);
    el.innerHTML=selectOpt('',placeholder)+values.map(x=>selectOpt(x.value,x.label)).join('');
    const wanted=values.some(x=>x.value===preferred)?preferred:'';
    el.value=wanted||(values.length===1?values[0].value:'');
    return el.value;
  }
  function syncVehicleFactoryProfile(form,changeField='',initial=false){
    if(!form)return;
    const f=k=>form.elements.namedItem(k);
    const year=num(f('model_year')?.value);
    const options=Catalog.find({year});
    const unique=(items)=>[...new Set(items)];
    const old=k=>initial?(f(k)?.dataset.catalogDefault||''):(f(k)?.value||'');
    const previous={generation:old('generation'),battery_pack:old('battery_pack'),variant:old('variant'),trim_level:old('trim_level')};
    // 2025 overlaps production generations. Never infer it silently after a year change.
    const gens=unique(options.map(v=>v.generation));
    const yearChanged=changeField==='model_year';
    const desiredGen=yearChanged&&gens.length>1?'':previous.generation;
    const generation=catalogSelect(f('generation'),gens.map(x=>({value:x,label:x==='facelift'?'Facelift (ny generation)':'Oprindelig'})),desiredGen,gens.length>1?'Vælg generation – obligatorisk':'Vælg generation');
    const packs=unique(Catalog.find({year,generation}).map(v=>v.pack));
    const pack=catalogSelect(f('battery_pack'),packs.map(x=>({value:x,label:x==='long'?'Long Range':'Standard Range'})),yearChanged?'':previous.battery_pack,'Vælg batteripakke');
    const drives=unique(Catalog.find({year,generation,pack}).map(v=>v.drive));
    const drive=catalogSelect(f('variant'),drives,yearChanged?'':previous.variant,'Vælg drivlinje');
    const trims=unique(Catalog.find({year,generation,pack,drive}).map(v=>v.trim));
    const trim=catalogSelect(f('trim_level'),trims.map(x=>({value:x,label:x==='Standard'?'EV6 Standard':x==='GT-Line'?'EV6 GT-Line':'EV6 GT (Performance)'})),yearChanged?'':previous.trim_level,'Vælg udstyr');
    const row=Catalog.find({year,generation,pack,drive,trim})[0]||null;
    f('catalog_variant_key').value=row?.key||'';
    f('battery_nominal_kwh').value=row?`${row.kwh.toLocaleString('da-DK',{minimumFractionDigits:1,maximumFractionDigits:1})} kWh`:'—';
    const output=form.querySelector('[data-factory-capacity]');
    if(output)output.textContent=row?`${row.kwh.toLocaleString('da-DK')} kWh`:'Vælg variant';
    const note=form.querySelector('[data-profile-year-note]');
    if(note)note.textContent=year===2025&&!generation?'2025 kan være original eller facelift. Vælg generationen eksplicit.':
      row?`${row.generation==='original'?'Oprindelig EV6':'Facelift'} · ${row.kwh.toLocaleString('da-DK')} kWh nominelt · ${row.drive} · fabriksspecifikation låst.`:
      'Vælg en verificeret kombination for at fortsætte.';
    const save=form.querySelector('button[type="submit"]');if(save)save.disabled=!row;
  }
  function setupNewVehicleForm(){
    const form=q('vehicleForm');
    if(!form)return;
    form.innerHTML=catalogFormMarkup(null)+`<button type="submit" class="primary-btn">Gem bilprofil</button>`;
    syncVehicleFactoryProfile(form,'',true);
  }
  function catalogChanged(form,field){
    syncVehicleFactoryProfile(form,field,false);
    if(form.id==='vehicleEditForm')refreshVehiclePreview();
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
    // Paginate explicitly: Supabase projects often cap a single query at 1,000 rows.
    // Never silently interpret the first batch as the entire battery history.
    const PAGE=1000,MAX=50000;
    const records=[];
    for(let offset=0;offset<MAX;offset+=PAGE){
      const {data,error}=await sb.from('battery_records').select('*')
        .eq('vehicle_id',currentVehicle.id).order('recorded_at',{ascending:true})
        .range(offset,offset+PAGE-1);
      if(error)throw error;
      records.push(...(data||[]));
      if(!data||data.length<PAGE)break;
      if(offset+PAGE>=MAX)throw new Error('Historikken overstiger 50.000 poster. Udvid indlæsningen, før data kan analyseres fuldstændigt.');
    }
    currentRecords=records;
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
      draft.capacity===null?'Vælg generation og variant':`${draft.generation === "facelift" ? "Facelift" : "Oprindelig EV6"} · ${draft.capacity.toLocaleString("da-DK", {minimumFractionDigits:1,maximumFractionDigits:1})} kWh`;
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
    if(!currentVehicle)return '<div class="empty-state">Opret først bilprofilen.</div>';
    const paint=paintByCode(currentVehicle.exterior_color_code||'KLM');
    return `${catalogFormMarkup(currentVehicle)}
      <div class="vehicle-form-section"><div class="eyebrow">KARROSSERI</div><h3>Original Kia-farve</h3>
        <input type="hidden" name="exterior_color_code" value="${esc(paint.code)}">
        <div class="vehicle-color-row"><div id="vehiclePaintSwatches" class="paint-swatches"></div><span id="vehiclePaintName" class="paint-name">${esc(paint.name)}</span></div>
        <p class="vehicle-settings-hint">Hero-billedet bagfra følger farven. Det fritlagte frontbillede følger generationen og er en referenceillustration.</p>
      </div>
      <div class="vehicle-save-row"><button class="primary-btn" type="submit">Gem bilprofil</button>
        <span>Fabriksbatteri: <strong data-factory-capacity></strong> · Kun gyldige katalogvarianter gemmes.</span></div>`;
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
    syncVehicleFactoryProfile(q("vehicleEditForm"),"",true);
    const expected=resolveFactoryBattery({...profile,trim:currentVehicle.trim_level});
    const stored=num(currentVehicle.battery_nominal_kwh);
    if(!currentVehicle.catalog_variant_key || (stored!==null && expected!==null && Math.abs(stored-expected)>.2)) {
      const el=document.createElement("p");
      el.className="vehicle-spec-warning";
      el.textContent=currentVehicle.catalog_variant_key
        ?`Den gamle batteriværdi (${fmt(stored,1)} kWh) matcher ikke kataloget (${fmt(expected,1)} kWh). Kontrollér og gem bilprofilen.`
        :'Ældre bilprofil uden bekræftet katalogvariant. Kontrollér årgang og generation, og vælg Gem bilprofil for at knytte den til det verificerede katalog.';
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
    q("metricCapacityEstimate").textContent = "Brugbar kapacitet: ikke målt";
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
    renderIntelligence();
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
      if(!currentVehicle.catalog_variant_key || (stored!==null && expected!==null && Math.abs(stored-expected)>.2)) {
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
    if (!currentVehicle.catalog_variant_key || canonical===null || Math.abs(Number(currentVehicle.battery_nominal_kwh)-canonical)>.2) {
      console.warn('EV Pulse: flådematch kræver verificeret katalogvariant, ret bilprofilen under Min bil.');
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
    const caption=q('fingerprintCaption');
    if (!box) return;
    const records=currentRecords;
    if (!records.length) {
      box.innerHTML='<div class="empty-state">Ingen batterimålinger endnu. Importér faktiske OBD-logs for at se tilstand og måledækning.</div>';
      if(caption) caption.textContent='Ingen datagrundlag · ingen batteriscore.';
      return;
    }
    // Two separate concepts: BMS-reported SoH is a vehicle measurement;
    // SoC coverage is only the breadth of our evidence, NOT battery health.
    // Count separate Copenhagen calendar days to avoid duplicate OBD polls
    // making measurement coverage appear more complete than it is.
    const bins=Array.from({length:5},()=>new Set());
    const allDays=new Set();
    const ranges=['0–19 %','20–39 %','40–59 %','60–79 %','80–100 %'];
    for(const rec of records) {
      const day=measurementDayKey(rec.recorded_at);
      if(!day) continue;
      allDays.add(day);
      const soc=num(rec.soc_display_percent);
      if(soc!==null && soc>=0 && soc<=100) {
        bins[Math.min(4,Math.floor(soc/20))].add(day);
      }
    }
    const soh=latestValid('soh_percent');
    const validSoh=soh!==null && soh>0 && soh<=100;
    const sufficientlyCovered=bins.filter(b=>b.size>=2).length;
    const maxDays=Math.max(2,...bins.map(b=>b.size));
    const fullReference=records.some(rec=>
      rec.record_type==='FULL_CHARGE_REFERENCE' &&
      num(rec.remaining_energy_kwh)!==null && num(rec.remaining_energy_kwh)>0 &&
      num(rec.soc_display_percent)!==null && num(rec.soc_display_percent)>=99
    );
    const bands=bins.map((days,i)=>{
      const count=days.size;
      const cls=count>=2?'adequate':count===1?'limited':'absent';
      const width=Math.round(100*count/maxDays);
      const detail=count===0?'ingen måledage':`${count} ${count===1?'måledag':'måledage'}`;
      return `<div class="fp-coverage-band ${cls}" title="${ranges[i]} SoC: ${detail}">
        <div class="fp-coverage-track"><span style="width:${width}%"></span></div>
        <span class="fp-band-range">${ranges[i]}</span>
        <span class="fp-band-days">${count} ${count===1?'dag':'dage'}</span>
      </div>`;
    }).join('');
    const status=fullReference
      ? `<div class="fp-reference is-available"><span class="fp-reference-icon" aria-hidden="true">✓</span><div><strong>Energireference registreret</strong><span>100 %-reference findes i dine data. Det er ikke i sig selv en uafhængig kapacitetstest.</span></div></div>`
      : `<div class="fp-reference is-missing"><span class="fp-reference-icon" aria-hidden="true">ⓘ</span><div><strong>Kapacitetstest mangler</strong><span>Ingen dokumenteret 100 %-energireference. Den faktiske brugbare kapacitet kan endnu ikke beregnes sikkert.</span></div></div>`;
    box.innerHTML=`<div class="fp-summary" aria-label="Batteritilstand og datadækning">
      <div class="fp-stat"><span class="fp-stat-label">BMS-batteritilstand</span><strong class="fp-stat-value">${validSoh?`${fmt(soh,1)} %`:'—'}</strong><span class="fp-stat-help">${validSoh?'Rapporteret af bilen':'Ingen gyldig SoH-måling'}</span></div>
      <div class="fp-stat"><span class="fp-stat-label">Måledækning</span><strong class="fp-stat-value">${sufficientlyCovered} <small>af 5</small></strong><span class="fp-stat-help">SoC-områder med mindst 2 måledage</span></div>
    </div>
    <div class="fp-coverage" aria-label="Registrerede måledage fordelt på ladeniveau">
      <div class="fp-coverage-heading"><strong>Målinger fordelt på batteriniveau</strong><span>${allDays.size} ${allDays.size===1?'måledag':'måledage'}</span></div>
      <div class="fp-coverage-bands">${bands}</div>
    </div>
    ${status}`;
    if(caption) caption.textContent='Måledækning viser, hvor bilen er målt – ikke hvor sundt batteriet er.';
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
    const row=formVariant(form);
    if(!row)throw new Error('Vælg en gyldig, verificeret bilvariant.');
    const paint=paintByCode('KLM');
    const payload={anon_vehicle_id:crypto.randomUUID(),manufacturer:row.manufacturer,
      model:row.model,model_year:Number(form.elements.namedItem('model_year').value),
      variant:row.drive,trim_level:row.trim,battery_nominal_kwh:row.kwh,
      platform:row.platform,catalog_variant_key:row.key,
      exterior_color_code:paint.code,exterior_color_name:paint.name};
    const {data,error}=await sb.from('vehicles').insert(payload).select('*').single();
    if(error)throw error;
    currentVehicle=data;renderVehicleState();await loadRecords();
  }
  async function updateVehicleFromForm(form) {
    const row=formVariant(form);
    if(!row)throw new Error('Vælg en gyldig, verificeret bilvariant.');
    const paint=colorFromForm(form);
    const payload={manufacturer:row.manufacturer,model:row.model,
      model_year:Number(form.elements.namedItem('model_year').value),variant:row.drive,
      trim_level:row.trim,battery_nominal_kwh:row.kwh,platform:row.platform,
      catalog_variant_key:row.key,exterior_color_code:paint.code,
      exterior_color_name:paint.name,updated_at:new Date().toISOString()};
    const {data,error}=await sb.from('vehicles').update(payload)
      .eq('id',currentVehicle.id).eq('owner_user_id',sessionUser.id)
      .select('*').single();
    if(error)throw error;
    currentVehicle=data;renderVehicleState();renderDashboard();await loadBenchmark();
  }



  function renderIntelligence(){
    currentAnalysis=Intelligence.analyze(currentRecords);
    const a=currentAnalysis;
    const nodes=['conditionStatus','conditionDays','conditionSoh','conditionCells','conditionCoverage','conditionPeriod','conditionReliability','conditionCapacity','conditionGuidance','conditionTimeline'];
    if(!q('conditionStatus'))return;
    q('conditionStatus').textContent=a.status;
    q('conditionDays').textContent=`${a.days.toLocaleString('da-DK')} måledage`;
    q('conditionSoh').textContent=a.sohLast===null?'—':`${fmt(a.sohLast,1)} %`;
    q('conditionCells').textContent=a.cellDays?`${a.cellDays} dage`:'Ingen gentagne screeninger';
    q('conditionCoverage').textContent=`${a.coveredBands}/5 SoC-områder`;
    q('conditionPeriod').textContent=a.dateStart?`${dateFmt(a.dateStart).split(',')[0]} – ${dateFmt(a.dateEnd).split(',')[0]}`:'Ingen målinger';
    q('conditionReliability').textContent=a.reliability;
    q('conditionCapacity').textContent=a.referenceCount?'Energireference registreret, men ingen uafhængig kapacitetstest':'Ikke målt – kræver kontrolleret kapacitetstest';
    q('conditionGuidance').innerHTML=a.recommendations.map(x=>`<li>${esc(x)}</li>`).join('');
    const icons={soh:'↘',cell:'⚡',soc:'⌁',dtc:'!' };
    q('conditionTimeline').innerHTML=a.events.length?a.events.slice(0,60).map(e=>`
      <article class="intel-event intel-${e.kind}"><span class="intel-event-symbol">${icons[e.kind]||'•'}</span>
        <div><div class="intel-event-top"><strong>${esc(e.title)}</strong><time datetime="${esc(e.time)}">${esc(dateFmt(e.time))}</time></div>
          <p>${esc(e.detail)}</p></div></article>`).join(''):
      '<p class="intel-empty">Ingen specifikke screeningshændelser i de tilgængelige målinger.</p>';
    q('conditionCount').textContent=`${a.events.length} registrerede observationshændelser`;
  }

  function reportMarkup(){
    const a=currentAnalysis||Intelligence.analyze(currentRecords);
    const specs=Catalog.get(currentVehicle?.catalog_variant_key)||Catalog.fromLegacy(currentVehicle);
    const name=specs?`${specs.manufacturer} ${specs.model} · ${specs.generation==='original'?'Original':'Facelift'} · ${specs.kwh.toLocaleString('da-DK')} kWh · ${specs.drive}`:'Bilprofil ikke verificeret';
    const d=(v)=>v?dateFmt(v):'—';
    return `<div class="report-sheet"><header><div class="report-brand">EV PULSE <span>BATTERY INTELLIGENCE</span></div><div class="report-meta">Batterihistorik · oprettet ${esc(new Date().toLocaleDateString('da-DK'))}</div></header>
      <h1>Battery Condition Report</h1><p class="report-car">${esc(name)} · Modelår ${esc(currentVehicle?.model_year||'—')}</p>
      <p class="report-disclaimer">Databaseret observationsrapport. Ingen officiel Kia-diagnose, værkstedsmåling eller uafhængig kapacitetstest.</p>
      <div class="report-grid"><div><span>Status</span><strong>${esc(a.status)}</strong></div><div><span>Seneste BMS SoH</span><strong>${a.sohLast===null?'—':`${fmt(a.sohLast,1)} %`}</strong></div><div><span>Måledage</span><strong>${a.days}</strong></div><div><span>SoC-dækning</span><strong>${a.coveredBands}/5</strong></div></div>
      <h2>Datagrundlag</h2><p>${a.records} registreringer · ${a.days} forskellige måledage · ${esc(d(a.dateStart))} til ${esc(d(a.dateEnd))}.</p>
      <p>BMS SoH: ${a.sohFirst===null?'—':fmt(a.sohFirst,1)+' %'} → ${a.sohLast===null?'—':fmt(a.sohLast,1)+' %'} (${a.sohChange===null?'ukendt':`${a.sohChange>0?'+':''}${fmt(a.sohChange,1)} procentpoint`}).</p>
      <p>Celleforskel ≥100 mV ved 20–90 % SoC: ${a.cellDays} forskellige dage. Batteriets faktiske brugbare kapacitet er ikke bestemt.</p>
      <h2>Observationer</h2><ul>${a.recommendations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <h2>Hændelser (seneste 20)</h2><table><thead><tr><th>Tidspunkt</th><th>Hændelse</th><th>Dokumenteret observation</th></tr></thead><tbody>
      ${a.events.slice(0,20).map(e=>`<tr><td>${esc(d(e.time))}</td><td>${esc(e.title)}</td><td>${esc(e.detail)}</td></tr>`).join('')||'<tr><td colspan="3">Ingen specifikke hændelser</td></tr>'}</tbody></table>
      <h2>Metode & forbehold</h2><p>SoH: seneste BMS-aflæsning pr. lokal måledag. Celle-screening: observeret differens ≥100 mV inden for 20–90 % SoC. Belastning, strøm og præcis cellesammensætning kendes ikke; værdien er ikke en defektgrænse. SoC-hvilefald vises kun for eksplicit registrerede REST_CHANGE-hændelser. Fejlkoder vises kun, hvis de står i lognotater. Flere målinger samme dag tælles ikke som uafhængige dage. Data fra egne Supabase-poster, ingen flådetal hvis færre end 5 uafhængige sammenlignelige biler.</p>
      <footer>EV Pulse Benchmark 1.0 · Rapporten indeholder ingen VIN, nummerplade eller GPS-position.</footer></div>`;
  }
  function printBatteryReport(){
    if(!currentVehicle||!currentRecords.length){window.alert('Der er endnu ingen batteridata at rapportere.');return;}
    const report=q('batteryPrintReport');
    report.innerHTML=reportMarkup();
    window.print();
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
    const actual = ["upload","vehicle","condition"].includes(name)?name:"overview";
    ["overview","upload","vehicle","condition"].forEach(v=>q(v+"View").classList.toggle("hidden",v!==actual));
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
    setupNewVehicleForm();
    document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));
    q("headerDataButton")?.addEventListener("click",()=>switchView("upload"));
    q("headerSettingsButton")?.addEventListener("click",()=>switchView("vehicle"));
    q("quickUpload")?.addEventListener("click",()=>switchView("upload"));
    q("quickHistory")?.addEventListener("click",()=>switchView("history"));
    q("quickCompare")?.addEventListener("click",()=>switchView("compare"));
    q("quickExport")?.addEventListener("click",exportOwnCsv);
    q("conditionReportButton")?.addEventListener("click",printBatteryReport);
    q("goCondition")?.addEventListener("click",()=>switchView("condition"));
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
      if(['model_year','generation','battery_pack','variant','trim_level'].includes(e.target.name))
        catalogChanged(e.currentTarget,e.target.name);
    });
    q("vehicleEditForm").addEventListener("submit",async e=>{
      e.preventDefault();setMessage(q("vehicleEditMessage"),"Gemmer…");
      try{await updateVehicleFromForm(e.currentTarget);setMessage(q("vehicleEditMessage"),"Ændringer gemt.","success")}
      catch(err){setMessage(q("vehicleEditMessage"),err.message||String(err),"error")}
    });
    q("vehicleEditForm").addEventListener("click",e=>{
      const btn=e.target.closest('.paint-swatch');if(!btn)return;
      const form=q('vehicleEditForm');form.elements.namedItem('exterior_color_code').value=btn.dataset.paint;
      renderPaintSwatches(form);refreshVehiclePreview();
    });
    q("vehicleEditForm").addEventListener("change",e=>{
      if(['model_year','generation','battery_pack','variant','trim_level'].includes(e.target.name))
        catalogChanged(e.currentTarget,e.target.name);
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