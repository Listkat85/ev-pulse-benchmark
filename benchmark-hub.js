/* EV Pulse 1.1.0 — Internal / External / Combined comparison.
   Curated publicly visible reference facts only. This file NEVER writes to Supabase.
   Referenced material is NOT a substitute for raw, permissioned AVILOO data. */
(function(global){
  'use strict';
  const SOURCES=Object.freeze({
    carla:Object.freeze({
      name:'Carla · Elbilsbatteristudie 2026',
      url:'https://www.carla.se/magasinet/elbilsmarknaden/elbilsmodellerna-med-hogst-batterihalsa-efter-10-000-mil',
      published:'8. juli 2026',
      methodology:'AVILOO-batteritests (ikke BMS SoH)',
      description:'EV6 77,4 kWh med mere end 100.000 km i svensk analyse',
      ev6Health:95.95,
      minimumKm:100000,
      totalTests:9954,
      ev6Tests:null, // Artiklen oplyser IKKE delprøvestørrelsen for EV6
      period:'2022–2026'
    }),
    community:Object.freeze({
      name:'Kia EV6 Forum · SoH und KM Stände',
      url:'https://www.ev6-forum.de/forum/thread/3678-soh-und-km-st%C3%A4nde/',
      published:'januar–marts 2026',
      methodology:'Ejere oplyser egne BMS/Car Scanner-værdier; ikke uafhængigt verificeret'
    })
  });
  const COMMUNITY=Object.freeze([
    Object.freeze({model:'EV6 RWD GT-Line · 77,4 kWh · 2022',km:71000,soh:92.5,method:'Selvrapporteret SoH',date:'20. jan. 2026',url:'https://www.ev6-forum.de/forum/thread/3678-soh-und-km-st%C3%A4nde/'}),
    Object.freeze({model:'EV6 AWD · 2023',km:64700,soh:100.0,method:'Car Scanner/BMS',date:'5. mar. 2026',url:'https://www.ev6-forum.de/forum/thread/3678-soh-und-km-st%C3%A4nde/?pageNo=3'}),
    Object.freeze({model:'EV6 AWD · 2023',km:109000,soh:99.7,method:'Car Scanner/BMS',date:'13. mar. 2026',url:'https://www.ev6-forum.de/forum/thread/3678-soh-und-km-st%C3%A4nde/?postID=178573'})
  ]);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const numeric=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
  const fmt=(n,d=1)=>Number(n).toLocaleString('da-DK',{minimumFractionDigits:d,maximumFractionDigits:d});
  const externalApplicable=(vehicle)=> {
    const v=vehicle||{}, key=String(v.catalog_variant_key||'').toLowerCase();
    return v.manufacturer==='Kia' && v.model==='EV6' && key.includes('original') && key.includes('long');
  };
  const sourceLink=(source,label)=>`<a href="${esc(source.url)}" rel="noopener noreferrer" target="_blank">${esc(label||'Åbn originalkilde')} <span aria-hidden="true">↗</span></a>`;
  function ownCard(ctx){
    const v=ctx.vehicle||{};
    const desc=[v.manufacturer||'Bil',v.model||'',v.model_year||''].filter(Boolean).join(' ');
    const health=numeric(ctx.soh), km=numeric(ctx.km);
    return `<section class="panel bm-own-card" aria-label="Din bil">
      <div class="bm-section-title"><span class="bm-label">DIN BIL · SUPABASE</span><span class="bm-chip bm-chip-green">Egne data</span></div>
      <div class="bm-own-identity">${esc(desc||'Ingen bilprofil endnu')}</div>
      <div class="bm-own-numbers"><div><small>BMS SoH</small><strong>${health===null?'—':fmt(health)+' %'}</strong></div><div><small>Kilometer</small><strong>${km===null?'—':fmt(km,0)+' km'}</strong></div><div><small>Målinger</small><strong>${fmt(ctx.recordCount||0,0)}</strong></div></div>
      <p class="bm-caption">Seneste BMS-aflæsning. Ikke en uafhængig kapacitetstest. Din bil indgår ikke i de andre bilers benchmarkudvalg.</p>
    </section>`;
  }
  function internalCard(ctx){
    const b=ctx.benchmark||{}, n=numeric(b.sample_size), p=numeric(b.percentile), median=numeric(b.median_soh), p25=numeric(b.p25_soh),p75=numeric(b.p75_soh);
    const eligible=!!ctx.vehicle?.catalog_variant_key && numeric(ctx.soh)!==null;
    const ready=eligible&&n!==null&&n>=5&&p!==null&&median!==null;
    const body=ready?`<div class="bm-main-number">${fmt(p,0)}<span>. percentil</span></div>
      <p class="bm-note">Placering blandt ${fmt(n,0)} andre, sammenlignelige biler. Kilderne er individuelle EV Pulse-biler med reelle Supabase-målinger.</p>
      <div class="bm-peer-metrics"><div><small>Median SoH · flåde</small><strong>${fmt(median)} %</strong></div><div><small>Midterste 50 %</small><strong>${p25===null||p75===null?'—':fmt(p25)+'–'+fmt(p75)+' %'}</strong></div></div>`:
      `<div class="bm-await"><span class="bm-wait-symbol">◌</span><strong>${eligible?'Afventer flådedata':'Mangler verificeret bilprofil eller SoH'}</strong><p>${eligible?'Vi viser først intern placering, når mindst fem andre selvstændige, teknisk sammenlignelige biler har rigtige målinger.':'Bekræft din bil under Min bil og importér faktiske batterimålinger. Der vises ingen kunstige testbiler.'}</p></div>`;
    return `<section class="panel bm-detail-card bm-internal-card">
      <div class="bm-section-title"><span>Intern flåde</span><span class="bm-chip">EV Pulse Fleet</span></div>
      ${body}<div class="bm-divider"></div>
      <p class="bm-method">Samme model, generation, batteri og drivlinje · modelår ±2 · kilometerstand ±25.000 km · seneste SoH pr. anden bil. Minimum 5 andre biler. Kun Supabase.</p>
      </section>`;
  }
  function externalResearchCard(ctx){
    const src=SOURCES.carla, applicable=externalApplicable(ctx.vehicle);
    return `<section class="panel bm-detail-card bm-research-card">
      <div class="bm-section-title"><span>Ekstern forskning</span><span class="bm-chip bm-chip-amber">AVILOO · kapacitetstest</span></div>
      <div class="bm-main-number">${fmt(src.ev6Health,2)}<span>% batterisundhed</span></div>
      <p class="bm-note">Kia EV6 77,4 kWh · gennemsnit i undersøgelsens gruppe med <strong>over 100.000 km</strong>.</p>
      <div class="bm-research-facts"><div><small>Samlet undersøgelse</small><strong>${fmt(src.totalTests,0)} tests</strong></div><div><small>Testperiode</small><strong>${esc(src.period)}</strong></div><div><small>EV6-delprøve</small><strong>Ikke oplyst</strong></div></div>
      <p class="bm-source-line">Kilde: ${esc(src.name)} · ${esc(src.published)} · ${sourceLink(src,'Læs undersøgelsen')}</p>
      <div class="bm-method-warning">${applicable?'Samme EV6-batterivariant, men anden kilometergruppe og målemetode end din bil.':'Artiklen omhandler EV6 77,4 kWh. Din valgte variant kan være en anden.'} <strong>AVILOO-resultatet kan ikke regnes direkte om til din BMS SoH eller bruges til din percentil.</strong></div>
      </section>`;
  }
  function communityCard(){
    return `<section class="panel bm-detail-card bm-community-card">
      <div class="bm-section-title"><span>Offentlige ejerobservationer</span><span class="bm-chip bm-chip-muted">Ikke verificeret</span></div>
      <p class="bm-note">Tre kildehenviste eksempler fra et offentligt EV6-forum. De er <strong>ikke</strong> importerede biler i EV Pulse og tæller <strong>ikke</strong> med i flåderangeringen.</p>
      <div class="bm-source-table-wrap"><table class="bm-source-table"><thead><tr><th>Bil</th><th>Kilometer</th><th>Oplyst SoH</th><th>Kilde</th></tr></thead><tbody>
      ${COMMUNITY.map(r=>`<tr><td>${esc(r.model)}<small>${esc(r.method)} · ${esc(r.date)}</small></td><td>${fmt(r.km,0)}</td><td>${fmt(r.soh)} %</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" aria-label="Åbn kilden for ${esc(r.model)}">Original ↗</a></td></tr>`).join('')}
      </tbody></table></div>
      <p class="bm-method">Selvrapporterede tal kan være fejlbehæftede eller ændret siden offentliggørelse. Brug dem som konkrete eksempler, ikke som statistik, kapacitetsmåling eller fejlgrænse.</p>
      </section>`;
  }
  function explainer(){
    return `<section class="panel bm-method-card"><div class="bm-section-title"><span>Sådan læses tallene</span><span class="bm-chip">Åben metode</span></div>
      <div class="bm-method-steps"><div><strong>1 · Intern</strong><p>BMS SoH fra individuelle EV Pulse-biler, matchet på tekniske specifikationer og kilometer. Kun ved ≥5 andre biler vises rangering.</p></div>
      <div><strong>2 · Ekstern</strong><p>Publiceret AVILOO-undersøgelse: kapacitetsmetode og kilometergruppe er anderledes. Eksterne tal holdes uden for Supabase-flåden.</p></div>
      <div><strong>3 · Kombination</strong><p>Begge kilder kan stå på samme side, men der beregnes ingen samlet score, blandet median eller fælles percentil.</p></div></div>
      <p class="bm-source-foot">Eksterne oplysninger er et manuelt kvalitetstjekket øjebliksbillede (16. oktober 2026), ikke en live-feed. Kontakt dataleverandøren for tilladelse før import af rådata.</p>
      </section>`;
  }
  function render({tab='all',vehicle=null,soh=null,km=null,recordCount=0,benchmark=null}={}) {
    const ctx={vehicle,soh,km,recordCount,benchmark};
    if(tab==='internal') return `<div class="bm-mode-heading"><h3>Intern flåde</h3><p>Rigtige brugerdata fra Supabase. Ingen eksterne tal i beregningen.</p></div><div class="bm-two-cols">${ownCard(ctx)}${internalCard(ctx)}</div>${explainer()}`;
    if(tab==='external') return `<div class="bm-mode-heading"><h3>Ekstern forskning</h3><p>Offentliggjort viden, tydeligt mærket med målemetode og kilde.</p></div><div class="bm-two-cols">${externalResearchCard(ctx)}${communityCard()}</div>${explainer()}`;
    return `<div class="bm-mode-heading"><h3>Samlet overblik</h3><p>Din bil, EV Pulse-flåden og ekstern forskning – samme side, men tre forskellige datagrundlag.</p></div>
      ${ownCard(ctx)}
      <div class="bm-two-cols bm-summary-grid">${internalCard(ctx)}${externalResearchCard(ctx)}</div>
      <div class="bm-section-tail">${communityCard()}</div>${explainer()}`;
  }
  global.EVPulseBenchmarkHub=Object.freeze({render,SOURCES,COMMUNITY,externalApplicable});
})(window);
