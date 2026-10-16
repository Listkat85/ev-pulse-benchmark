/* EV Pulse 1.0 – pure, deterministic analysis; no network, demo values or diagnoses. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.EVPulseIntelligence=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const n=(v)=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
  const timestamp=r=>new Date(r.recorded_at).getTime();
  const key=(r)=>{
    const d=new Date(r.recorded_at);
    if(!Number.isFinite(d.getTime()))return null;
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };
  const validSoH=r=>n(r.soh_percent)!==null&&n(r.soh_percent)>0&&n(r.soh_percent)<=100;
  const validSoc=r=>n(r.soc_display_percent)!==null&&n(r.soc_display_percent)>=0&&n(r.soc_display_percent)<=100;
  const energyRef=r=>r.record_type==='FULL_CHARGE_REFERENCE'&&validSoc(r)&&n(r.soc_display_percent)>=99&&n(r.remaining_energy_kwh)!==null&&n(r.remaining_energy_kwh)>0;
  function analyze(input){
    const records=(input||[]).filter(r=>r&&Number.isFinite(timestamp(r))).sort((a,b)=>timestamp(a)-timestamp(b));
    const days=new Set(records.map(key).filter(Boolean));
    const socDays=Array.from({length:5},()=>new Set());
    const sohDaily=new Map(),tempDaily=new Map(),cellDays=new Map();
    const temperature=(r)=>n(r.battery_temp_avg_c)??(n(r.battery_temp_min_c)!==null&&n(r.battery_temp_max_c)!==null?(n(r.battery_temp_min_c)+n(r.battery_temp_max_c))/2:null);
    for(const r of records){
      const day=key(r);if(!day)continue;
      if(validSoc(r))socDays[Math.min(4,Math.floor(n(r.soc_display_percent)/20))].add(day);
      if(validSoH(r))sohDaily.set(day,r);
      if(temperature(r)!==null)tempDaily.set(day,r);
      const delta=n(r.cell_delta_mv),soc=n(r.soc_display_percent);
      // Screening window only: load is generally unknown, so NOT a fault threshold.
      if(delta!==null&&delta>=100&&delta<=1000&&soc!==null&&soc>=20&&soc<=90){
        const arr=cellDays.get(day)||[];arr.push(r);cellDays.set(day,arr);
      }
    }
    const sohDays=[...sohDaily.values()];
    const sohFirst=sohDays[0],sohLast=sohDays.at(-1);
    const sohChange=sohFirst&&sohLast?+(n(sohLast.soh_percent)-n(sohFirst.soh_percent)).toFixed(2):null;
    const cellDaysCount=cellDays.size;
    const referenceCount=records.filter(energyRef).length;
    const events=[];
    let prev=null;
    for(const r of sohDays){
      if(prev&&Math.abs(n(r.soh_percent)-n(prev.soh_percent))>=.1){
        events.push({kind:'soh',time:r.recorded_at,day:key(r),title:'BMS SoH ændret',detail:`${n(prev.soh_percent).toLocaleString('da-DK')} % → ${n(r.soh_percent).toLocaleString('da-DK')} % · BMS-estimat, ikke kapacitetstest`,record_id:r.id||null});
      }
      prev=r;
    }
    for(const [day,items] of cellDays){
      const r=[...items].sort((a,b)=>n(b.cell_delta_mv)-n(a.cell_delta_mv))[0];
      events.push({kind:'cell',time:r.recorded_at,day,title:'Forhøjet celleforskel registreret',detail:`Op til ${Math.round(n(r.cell_delta_mv))} mV · ${n(r.soc_display_percent).toLocaleString('da-DK')} % SoC. Belastning/strøm er ukendt; ikke en diagnose.`,record_id:r.id||null});
    }
    for(const r of records){
      // Only explicitly recorded REST_CHANGE with both known SoCs. Do not
      // misinterpret normal driving discharge as an unexplained battery loss.
      if(r.record_type==='REST_CHANGE'&&validSoc(r)&&n(r.previous_soc_percent)!==null){
        const drop=n(r.previous_soc_percent)-n(r.soc_display_percent);
        if(drop>=4){events.push({kind:'soc',time:r.recorded_at,day:key(r),title:'SoC-fald under registreret hvile',detail:`${drop.toLocaleString('da-DK')} procentpoint mellem oplyste målinger. Kontroller varighed og driftsforhold.`,record_id:r.id||null});}
      }
      // Only explicitly present DTC tokens from record notes.
      const codes=[...new Set((String(r.note||'').match(/\b(?:P|U|B|C)[0-3][0-9A-F]{3}\b/gi)||[]).map(x=>x.toUpperCase()))];
      if(codes.length){events.push({kind:'dtc',time:r.recorded_at,day:key(r),title:'Fejlkode i lognotat',detail:codes.join(', '),record_id:r.id||null});}
    }
    const uniqueEvents=new Map();
    for(const e of events)uniqueEvents.set(`${e.kind}|${e.day}|${e.kind==='dtc'?e.detail:''}`,e);
    const chronology=[...uniqueEvents.values()].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
    const recommendations=[];
    if(sohChange!==null&&sohChange<=-1)recommendations.push(`BMS SoH har ændret sig ${Math.abs(sohChange).toLocaleString('da-DK')} procentpoint i måleperioden. Følg udviklingen og sammenhold med værkstedsresultater.`);
    if(cellDaysCount>=2)recommendations.push(`${cellDaysCount} forskellige måledage indeholder celleforskel på mindst 100 mV ved 20–90 % SoC. Sammenlign kun ved tilsvarende belastning og temperatur; disse felter mangler ofte.`);
    if(!referenceCount)recommendations.push('Ingen verificeret kapacitetstest. BMS SoH og resterende energi må ikke udlægges som målt brugbar kapacitet.');
    if(!recommendations.length&&records.length)recommendations.push('Ingen af de valgte screeningsmønstre blev udløst. Det udelukker ikke tekniske fejl.');
    const hasSignals=cellDaysCount>=2||(sohChange!==null&&sohChange<=-1)||chronology.some(x=>x.kind==='soc'||x.kind==='dtc');
    const status=!records.length?'Ingen data':hasSignals?'Observationer til gennemgang':'Historik registreret';
    return {records:records.length,days:days.size,dateStart:records[0]?.recorded_at||null,dateEnd:records.at(-1)?.recorded_at||null,
      sohFirst:sohFirst?n(sohFirst.soh_percent):null,sohLast:sohLast?n(sohLast.soh_percent):null,sohChange,
      socCoverage:socDays.map(s=>s.size),coveredBands:socDays.filter(s=>s.size>=2).length,
      cellDays:cellDaysCount,maxCellMv:records.reduce((m,r)=>{const x=n(r.cell_delta_mv);return x!==null&&x>=0&&x<=1000?Math.max(m,x):m},0),
      tempDays:tempDaily.size,referenceCount,events:chronology,recommendations,status,
      reliability:days.size>=10?'Historik med flere måledage; belastning og uafhængig kapacitetstest mangler':days.size>=2?'Begrænset historisk grundlag':'Utilstrækkelige målinger',
      conditionIsDiagnosis:false};
  }
  return Object.freeze({analyze,dayKey:key});
});
