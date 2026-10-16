/* EV Pulse 1.0 – centrally declared, source-referenced EV6 DK catalogue.
   Gross factory battery capacity, never measured usable kWh or estimated SoH.
   New manufacturers/models can be added as verified entries, not free text.
   https://press.kiamotors.dk/pressreleases/kia-lancerer-ev6-med-stort-aabent-hus-den-20-21-november-3143857
   https://www.kia.com/dk/modeller/ev6/digital-discover/
*/
(function(root, factory){
  const api=factory();
  if (typeof module==='object' && module.exports) module.exports=api;
  root.EVPulseCatalog=api;
})(typeof window!=='undefined'?window:globalThis, function(){
  const years=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
  const rows=[];
  const add=(generation,pack,drive,trim,kwh,validYears)=>{
    rows.push(Object.freeze({key:`kia-ev6-${generation}-${pack}-${drive.toLowerCase()}-${trim==='GT Performance'?'gt':trim==='GT-Line'?'gtline':'standard'}`,
      manufacturer:'Kia',model:'EV6',generation,pack,drive,trim,kwh,platform:'E-GMP',years:Object.freeze(validYears)}));
  };
  const original=years(2021,2025), facelift=[2025,2026];
  // Standard Range RWD, Long Range RWD/AWD, original-generation GT AWD.
  for(const trim of ['Standard','GT-Line']){
    add('original','standard','RWD',trim,58,original);
    add('original','long','RWD',trim,77.4,original);
    add('original','long','AWD',trim,77.4,original);
  }
  add('original','long','AWD','GT Performance',77.4,[2023,2024,2025]);
  // Danish Kia documentation: SR 62.9 kWh; LR 84.0 kWh.
  add('facelift','standard','RWD','Standard',62.9,facelift);
  for(const trim of ['Standard','GT-Line']){
    add('facelift','long','RWD',trim,84,facelift);
    add('facelift','long','AWD',trim,84,facelift);
  }
  // Facelift GT Performance excluded until a specific Danish-spec technical
  // combination is verified. Do not invent variants to fill the selector.
  const variants=Object.freeze(rows);
  const get=(key)=>variants.find(v=>v.key===key)||null;
  const find=(options={})=>variants.filter(v=>
    (options.year==null||v.years.includes(Number(options.year))) &&
    (options.generation==null||v.generation===options.generation) &&
    (options.pack==null||v.pack===options.pack) &&
    (options.drive==null||v.drive===options.drive) &&
    (options.trim==null||v.trim===options.trim));
  const modelYears=()=>[...new Set(variants.flatMap(v=>v.years))].sort((a,b)=>a-b);
  const fromLegacy=(vehicle)=>{
    if(!vehicle)return null;
    if(vehicle.catalog_variant_key&&get(vehicle.catalog_variant_key))return get(vehicle.catalog_variant_key);
    if(vehicle.manufacturer!=='Kia'||vehicle.model!=='EV6')return null;
    const year=Number(vehicle.model_year);
    const kwh=Number(vehicle.battery_nominal_kwh);
    const pack=([58,62.9,63].some(n=>Math.abs(n-kwh)<.25))?'standard':'long';
    const generation=year<2025?'original':([58,77.4].some(n=>Math.abs(n-kwh)<.25)?'original':'facelift');
    const trim=vehicle.trim_level||'Standard';
    const drive=trim==='GT Performance'?'AWD':vehicle.variant||'RWD';
    return find({year,generation,pack,drive,trim})[0]||null;
  };
  return Object.freeze({variants,get,find,modelYears,fromLegacy});
});
