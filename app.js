
(() => {
  const cfg = window.EVPULSE_CONFIG;
  const els = {};
  let sb = null;
  let sessionUser = null;
  let currentVehicle = null;
  let currentRecords = [];
  let parsedRows = [];
  let selectedFile = null;

  const q = (id) => document.getElementById(id);
  const num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (v, digits = 1) => Number.isFinite(Number(v))
    ? Number(v).toLocaleString("da-DK", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";
  const dateFmt = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("da-DK", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" });
  };
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
      } else {
        cell += ch;
      }
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
    const { data, error } = await sb
      .from("battery_records")
      .select("*")
      .eq("vehicle_id", currentVehicle.id)
      .order("recorded_at", { ascending: true })
      .limit(5000);
    if (error) throw error;
    currentRecords = data || [];
    renderDashboard();
  }

  function renderVehicleState() {
    const setup = q("setupPanel");
    if (!currentVehicle) {
      setup.classList.remove("hidden");
      q("vehicleLine").textContent = "Ingen bilprofil endnu";
      q("vehicleEditForm").innerHTML = '<div class="empty-state">Opret først bilprofilen øverst.</div>';
      return;
    }
    setup.classList.add("hidden");
    q("vehicleLine").textContent =
      [currentVehicle.manufacturer, currentVehicle.model, currentVehicle.model_year, currentVehicle.variant]
        .filter(Boolean).join(" · ") +
      (currentVehicle.battery_nominal_kwh ? ` · ${String(currentVehicle.battery_nominal_kwh).replace(".", ",")} kWh` : "");

    const fields = [
      ["manufacturer","Mærke", currentVehicle.manufacturer || ""],
      ["model","Model", currentVehicle.model || ""],
      ["variant","Variant", currentVehicle.variant || ""],
      ["model_year","Modelår", currentVehicle.model_year || "", "number"],
      ["battery_nominal_kwh","Batteri, kWh", currentVehicle.battery_nominal_kwh || "", "number"],
      ["platform","Platform", currentVehicle.platform || "E-GMP"]
    ];
    q("vehicleEditForm").innerHTML = fields.map(([name,label,value,type="text"]) =>
      `<label>${label}<input name="${name}" type="${type}" ${name==="battery_nominal_kwh"?'step="0.1"':""} value="${String(value).replace(/"/g,"&quot;")}"></label>`
    ).join("") + '<button class="primary-btn" type="submit">Gem ændringer</button>';
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
    q("metricEnergyMeta").textContent = latestFull
      ? `Senest ${dateFmt(latestFull.recorded_at)}`
      : "Kræver FULL_CHARGE_REFERENCE";

    q("metricDelta").textContent = latestDeltaRecord ? `${fmt(latestDeltaRecord.cell_delta_mv,0)} mV` : "—";
    q("metricDeltaMeta").textContent = latestDeltaRecord
      ? `${fmt(latestDeltaRecord.soc_display_percent,1)} % SoC · kanal #${latestDeltaRecord.min_cell_number || "—"} lavest`
      : "Ingen målinger";

    q("metricRecords").textContent = records.length.toLocaleString("da-DK");
    q("metricRecordsMeta").textContent = `${full.length} fulde referencer`;

    q("heroInsight").textContent = records.length
      ? `${records.length} Battery Evidence-records · senest ${dateFmt(records.at(-1)?.recorded_at)}`
      : "Upload Battery Evidence CSV for at bygge din tidslinje.";

    renderSohChart();
    renderEvidenceList();
  }

  function renderSohChart() {
    const chart = q("sohChart");
    const pointsRaw = currentRecords
      .filter(r => Number(r.soh_percent) > 0 && Number(r.odometer_km) >= 0)
      .map(r => ({ x:Number(r.odometer_km), y:Number(r.soh_percent), date:r.recorded_at }));

    const byKey = new Map();
    pointsRaw.forEach(p => byKey.set(`${p.x}|${p.y}`, p));
    const pts = [...byKey.values()];
    if (pts.length < 1) {
      chart.innerHTML = '<div class="empty-state">Ingen SoH-data endnu.</div>';
      return;
    }

    const w = 1000, h = 250, padL = 62, padR = 24, padT = 24, padB = 42;
    let minX = Math.min(...pts.map(p=>p.x)), maxX = Math.max(...pts.map(p=>p.x));
    let minY = Math.min(...pts.map(p=>p.y)), maxY = Math.max(...pts.map(p=>p.y));
    if (maxX === minX) { minX -= 1000; maxX += 1000; }
    minY = Math.min(100, Math.floor((minY - 1.5) * 2) / 2);
    maxY = Math.max(100, Math.ceil((maxY + .5) * 2) / 2);
    if (maxY - minY < 3) minY = maxY - 3;

    const sx = x => padL + (x-minX)/(maxX-minX)*(w-padL-padR);
    const sy = y => padT + (maxY-y)/(maxY-minY)*(h-padT-padB);

    const line = pts.map((p,i)=>`${i?"L":"M"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
    const ticksY = 4;
    let grids = "", labels = "";
    for(let i=0;i<=ticksY;i++){
      const yv=minY+(maxY-minY)*i/ticksY, yy=sy(yv);
      grids += `<line x1="${padL}" x2="${w-padR}" y1="${yy}" y2="${yy}" stroke="rgba(176,186,200,.10)" />`;
      labels += `<text x="${padL-12}" y="${yy+4}" text-anchor="end" fill="#738091" font-size="11">${yv.toFixed(1)}%</text>`;
    }
    const xTicks=4;
    for(let i=0;i<=xTicks;i++){
      const xv=minX+(maxX-minX)*i/xTicks, xx=sx(xv);
      grids += `<line y1="${padT}" y2="${h-padB}" x1="${xx}" x2="${xx}" stroke="rgba(176,186,200,.07)" />`;
      labels += `<text x="${xx}" y="${h-15}" text-anchor="middle" fill="#738091" font-size="11">${Math.round(xv).toLocaleString("da-DK")} km</text>`;
    }
    const circles = pts.map(p=>`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="5" fill="#A7D9C4" stroke="#111720" stroke-width="3"><title>${fmt(p.y,1)} % · ${Math.round(p.x).toLocaleString("da-DK")} km · ${dateFmt(p.date)}</title></circle>`).join("");

    chart.innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="SoH over kilometer">
      ${grids}${labels}
      <path d="${line}" fill="none" stroke="#A7D9C4" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
    </svg>`;
  }

  function recordLabel(type) {
    const map = {
      FULL_CHARGE_REFERENCE:"100 % reference",
      LOW_SOC_REFERENCE:"Lav-SoC reference",
      REST_CHANGE:"Hvileændring",
      UNOBSERVED_DRIVING:"Kørsel mellem målinger",
      WAKE:"Wake",
      OBSERVATION:"Observation"
    };
    return map[type] || type || "Observation";
  }

  function renderEvidenceList() {
    const box = q("evidenceList");
    const rows = [...currentRecords].reverse().slice(0, 8);
    if (!rows.length) { box.innerHTML = '<div class="empty-state">Ingen records endnu.</div>'; return; }
    box.innerHTML = rows.map(r => `
      <div class="evidence-item">
        <div class="evidence-type">${recordLabel(r.record_type)}</div>
        <div class="evidence-main"><strong>${fmt(r.soh_percent,1)} % SoH</strong> · ${fmt(r.soc_display_percent,1)} % SoC · ${fmt(r.remaining_energy_kwh,2)} kWh</div>
        <div class="evidence-date">${dateFmt(r.recorded_at)}<br>${r.odometer_km ? Math.round(r.odometer_km).toLocaleString("da-DK")+" km" : ""}</div>
      </div>`).join("");
  }

  async function createVehicleFromForm(form) {
    const fd = new FormData(form);
    const anonId = crypto.randomUUID();
    const payload = {
      anon_vehicle_id: anonId,
      platform: String(fd.get("platform") || "E-GMP").trim(),
      manufacturer: String(fd.get("manufacturer") || "").trim(),
      model: String(fd.get("model") || "").trim(),
      variant: String(fd.get("variant") || "").trim() || null,
      model_year: num(fd.get("model_year")),
      battery_nominal_kwh: num(fd.get("battery_nominal_kwh"))
    };
    const { data, error } = await sb.from("vehicles").insert(payload).select("*").single();
    if (error) throw error;
    currentVehicle = data;
    renderVehicleState();
    await loadRecords();
  }

  async function updateVehicleFromForm(form) {
    const fd = new FormData(form);
    const payload = {
      platform:String(fd.get("platform") || "").trim(),
      manufacturer:String(fd.get("manufacturer") || "").trim(),
      model:String(fd.get("model") || "").trim(),
      variant:String(fd.get("variant") || "").trim() || null,
      model_year:num(fd.get("model_year")),
      battery_nominal_kwh:num(fd.get("battery_nominal_kwh")),
      updated_at:new Date().toISOString()
    };
    const { data, error } = await sb.from("vehicles").update(payload).eq("id", currentVehicle.id).select("*").single();
    if (error) throw error;
    currentVehicle=data;
    renderVehicleState();
  }

  function renderPreview() {
    const mapped = parsedRows.slice(0, 5);
    q("previewCount").textContent = `${parsedRows.length} records fundet`;
    q("previewContent").innerHTML = `<table>
      <thead><tr><th>Type</th><th>Km</th><th>SoC</th><th>SoH</th><th>Remaining</th><th>Delta</th></tr></thead>
      <tbody>${mapped.map(r=>`<tr><td>${r.type}</td><td>${r.odometer_km}</td><td>${r.soc_percent}%</td><td>${r.soh_percent}%</td><td>${r.remaining_kwh} kWh</td><td>${r.cell_delta_mv} mV</td></tr>`).join("")}</tbody>
    </table>`;
    q("previewBox").classList.remove("hidden");
  }

  async function uploadRows() {
    if (!currentVehicle) {
      setMessage(q("uploadMessage"), "Opret bilprofilen først.", "error");
      return;
    }
    if (!parsedRows.length) return;

    const payload = parsedRows
      .map(mapRow)
      .filter(r => r.recorded_at && r.record_type && r.client_record_id);

    if (!payload.length) {
      setMessage(q("uploadMessage"), "CSV-filen indeholder ingen gyldige Battery Evidence-records.", "error");
      return;
    }

    q("uploadButton").disabled = true;
    setMessage(q("uploadMessage"), `Uploader ${payload.length} records…`);

    let uploaded = 0;
    const batchSize = 250;
    try {
      for (let i = 0; i < payload.length; i += batchSize) {
        const batch = payload.slice(i, i + batchSize);
        const { error } = await sb.from("battery_records").upsert(batch, {
          onConflict: "vehicle_id,client_record_id",
          ignoreDuplicates: true
        });
        if (error) throw error;
        uploaded += batch.length;
        setMessage(q("uploadMessage"), `Uploader… ${Math.min(uploaded,payload.length)} / ${payload.length}`);
      }
      setMessage(q("uploadMessage"), `Færdig. ${payload.length} records behandlet; dubletter ignoreres automatisk.`, "success");
      await loadRecords();
      switchView("overview");
    } catch (err) {
      console.error(err);
      setMessage(q("uploadMessage"), `Upload fejlede: ${err.message || err}`, "error");
    } finally {
      q("uploadButton").disabled = false;
    }
  }

  function switchView(name) {
    ["overview","upload","vehicle"].forEach(v => q(v+"View").classList.toggle("hidden", v !== name));
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));
  }

  function bindUi() {
    document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));

    q("vehicleForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      setMessage(q("vehicleFormMessage"), "Gemmer…");
      try {
        await createVehicleFromForm(e.currentTarget);
        setMessage(q("vehicleFormMessage"), "Bilprofil gemt.", "success");
      } catch (err) {
        setMessage(q("vehicleFormMessage"), err.message || String(err), "error");
      }
    });

    q("vehicleEditForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      setMessage(q("vehicleEditMessage"), "Gemmer…");
      try {
        await updateVehicleFromForm(e.currentTarget);
        setMessage(q("vehicleEditMessage"), "Ændringer gemt.", "success");
      } catch (err) {
        setMessage(q("vehicleEditMessage"), err.message || String(err), "error");
      }
    });

    const fileInput = q("csvFile");
    const handleFile = async (file) => {
      selectedFile = file;
      q("fileLabel").textContent = file ? file.name : "Ingen fil valgt";
      q("uploadButton").disabled = !file;
      q("previewButton").disabled = !file;
      q("previewBox").classList.add("hidden");
      parsedRows = [];
      if (file) {
        try {
          parsedRows = parseCsv(await file.text());
          const required = ["timestamp","type","odometer_km","soc_percent","soh_percent","remaining_kwh"];
          const headers = parsedRows[0] ? Object.keys(parsedRows[0]) : [];
          const missing = required.filter(h => !headers.includes(h));
          if (missing.length) {
            setMessage(q("uploadMessage"), `CSV genkendes ikke. Mangler: ${missing.join(", ")}`, "error");
            q("uploadButton").disabled = true;
            q("previewButton").disabled = true;
          } else {
            setMessage(q("uploadMessage"), `${parsedRows.length} Battery Evidence-records fundet.`, "success");
          }
        } catch (err) {
          setMessage(q("uploadMessage"), `Kunne ikke læse CSV: ${err.message || err}`, "error");
        }
      }
    };
    fileInput.addEventListener("change", () => handleFile(fileInput.files?.[0] || null));

    const dz = q("dropzone");
    ["dragenter","dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("dragover"); }));
    ["dragleave","drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("dragover"); }));
    dz.addEventListener("drop", e => {
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    });

    q("previewButton").addEventListener("click", renderPreview);
    q("uploadButton").addEventListener("click", uploadRows);
  }

  async function init() {
    bindUi();
    try {
      if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_PUBLISHABLE_KEY) throw new Error("Supabase config mangler.");
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });

      sessionUser = await ensureAnonymousSession();
      q("sideMeta").textContent = "Anonym session · " + sessionUser.id.slice(0,8);
      setOnline(true, "Forbundet");
      await loadVehicle();
      await loadRecords();
    } catch (err) {
      console.error(err);
      setOnline(false, "Forbindelsesfejl");
      q("sideMeta").textContent = err.message || String(err);
      q("heroInsight").textContent = "Kunne ikke forbinde til Supabase. Tjek Anonymous Sign-ins og permissions.";
    }
  }

  init();
})();
