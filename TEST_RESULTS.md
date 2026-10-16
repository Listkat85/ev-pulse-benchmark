# EV Pulse Benchmark v1.1.0 – QA

Testdato: 16. oktober 2026. Testmiljø: isoleret Chromium uden produktionsadgang. Supabase-metoder blev simuleret med de **351 originale Battery Evidence-records** fra EV6-historikfilen samt en bilprofil med v1.0.0-katalognøgle. Dette ændrer **intet** i brugerens live-Supabase.

## Automatiske kontroller

- **Desktop, ingen peers (1440 px):** 351 poster indlæses, SoH 97,5 %, kilometer 71.079; fanerne virker; intern flåde viser korrekt *Afventer flådedata*; ekstern forskning viser 95,95 % / 9.954 tests med kilde; ejerobservationer er særskilt markeret. Ingen JavaScript-fejl eller vandret overflow.
- **Mobil, ingen peers (390 px):** fanerne og alle paneler vises, inkl. 351 poster og eksterne kilder. Ingen JavaScript-fejl eller vandret overflow.
- **Desktop, 8 simulerede, uafhængige peers:** eksisterende Supabase-benchmarkresultat vises med percentil, median og kvartiler. Eksterne referencer påvirker ikke intern placering. *Bemærk:* otte peers er **testfixture**, ikke eksisterende biler i brugerens database.
- **Adskillelse:** Fanen *Intern flåde* viser ikke Carla/AVILOO-tal; *Ekstern forskning* viser ingen flåderangering og importerer ingen forumeksempler i intern statistik; *Samlet overblik* holder kilderne i separate paneler.
- **Navigation:** Sammenligning åbnes som selvstændig side via sidebar; fanevalg og tastatur-navigation fungerer; Battery Condition er stadig tilgængelig og viser korrekte værdier.
- **JS-parsing:** `node --check` af `app.js` og `benchmark-hub.js` er gennemført uden syntaksfejl.

Screenshots fra de isolerede tests leveres som separate forhåndsvisninger, ikke som live-produktionsskærmbilleder.

## Ikke verificeret live

Vercel-deployment, reelle andre peer-brugere i Supabase, tredjeparts live-API'er og reel licens til genbrug af rådata er ikke testet. Installation er kun filudskiftning i Git. **Ingen nye SQL-migrationer** kræves, hvis v1.0.0/SQL 07 og 08 allerede er aktivt.
