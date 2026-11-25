-- Marketing analyse: de kolom Kanaal in de leads-kopie, en één vaste telling van de
-- websiteleads van udenhout.nl uit Syntec.
--
-- Besluit van de eigenaar (25 november 2026), zie campagne-analyse-tool.md §15:
--  - Bij een Campagne analyse komt het leadcijfer altijd uit precies één bron: Google
--    Analytics (standaard) óf Syntec (alleen als het doel in de briefing dat expliciet zegt).
--  - Een Syntec-lead telt alleen als Kanaalgroep = 'Internet' én Kanaal of Onderwerp
--    'udenhout.nl' bevat (hoofdletterongevoelig).
--
-- Daarvoor is de kolom Kanaal nodig, die tot nu toe niet in de kopie stond (zes kolommen,
-- nu zeven). De view marketing_analyse_leads_website past de voorwaarden toe en leidt de
-- soort lead af uit Onderwerp en Kanaal, zodat elke analyse precies dezelfde telling gebruikt.
-- Dezelfde logica staat in TypeScript in lib/sync/analyseLeads.ts (getest); houd ze gelijk.

alter table dataloket.marketing_analyse_leads add column if not exists kanaal text;

comment on table dataloket.marketing_analyse_leads is
  'Marketing analyse: nachtelijke kopie van het sheet-tabblad "Data leads" met zeven kolommen 1-op-1 (Kanaal, Ordersoort, Onderwerp, Kanaalgroep, Merk, Model, Aangelegd), de laatste 365 dagen, zonder rijen met "FW:" in Onderwerp. Alleen van toepassing op Van den Udenhout. Voor het leadcijfer van een Campagne analyse: gebruik marketing_analyse_leads_website.';

create or replace view dataloket.marketing_analyse_leads_website
  with (security_invoker = true) as
select
  l.kanaal,
  l.ordersoort,
  l.onderwerp,
  l.kanaalgroep,
  l.merk,
  l.model,
  l.aangelegd,
  l.aangelegd_op,
  -- Soort lead, in deze volgorde (klopt in november 2026 voor 99,9% met Lead type in Syntec).
  case
    when lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%proefrit%' then 'proefrit'
    when lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%private lease%'
      or lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%privatelease%' then 'private lease'
    when lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%offerte%' then 'offerte'
    when lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%inruil%' then 'inruil'
    else 'overig'
  end as soort
from dataloket.marketing_analyse_leads l
where l.kanaalgroep = 'Internet'
  and (l.kanaal ilike '%udenhout.nl%' or l.onderwerp ilike '%udenhout.nl%');

comment on view dataloket.marketing_analyse_leads_website is
  'Marketing analyse: de Syntec-leads die bij een Campagne analyse als lead tellen (Kanaalgroep = Internet en Kanaal of Onderwerp bevat udenhout.nl), met de soort lead (proefrit, private lease, offerte, inruil, overig). Alleen van toepassing op Van den Udenhout.';

grant select on dataloket.marketing_analyse_leads_website to authenticated, service_role;
