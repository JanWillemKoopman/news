-- Marketing analyse: altijd een volledig overzicht van leads en orders (Van den Udenhout)
--
-- WAAROM DIT BESTAAT
-- Verzoek van de eigenaar, 25 november 2026 (campagne-analyse-tool.md §22): bij een analyse
-- wil hij altijd zien wat een auto in totaal deed in Syntec, niet alleen de websiteleads en de
-- verkoop aan klanten:
--  - leads: alle leads voor merk en model, hoeveel daarvan uit Internet, en welke soorten
--    (proefrit, offerte, private lease, inruil, overig) uit Internet;
--  - orders: het totaal van alle orders (ook Rent en Handel) en een uitsplitsing per ordertype.
--
-- WAT ER KOMT
--  - marketing_analyse_leads_soort: alle leads uit de kopie met de soort (zelfde regel als in
--    marketing_analyse_leads_website) en twee vlaggen: internet en website (udenhout.nl).
--  - marketing_analyse_orders_type: alle orders uit de kopie met een ordertype, ingedeeld op
--    klantgroep (Handel op ordersoort). Gelijk aan `soortWebsiteLead`, `isWebsiteLead` en `ordertypeVan` in TypeScript
--    (lib/sync/analyseLeads.ts en analyseOrders.ts, getest); houd ze gelijk.

create or replace view dataloket.marketing_analyse_leads_soort as
select l.kanaal, l.ordersoort, l.onderwerp, l.kanaalgroep, l.merk, l.model, l.aangelegd, l.aangelegd_op,
       case
         when lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%proefrit%' then 'proefrit'
         when lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%private lease%'
           or lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%privatelease%' then 'private lease'
         when lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%offerte%' then 'offerte'
         when lower(coalesce(l.onderwerp, '') || ' ' || coalesce(l.kanaal, '')) like '%inruil%' then 'inruil'
         else 'overig'
       end as soort,
       coalesce(l.kanaalgroep = 'Internet', false) as internet,
       coalesce(l.kanaalgroep = 'Internet' and (l.kanaal ilike '%udenhout.nl%' or l.onderwerp ilike '%udenhout.nl%'), false) as website,
       coalesce(l.kanaalgroep, 'Geen kanaalgroep') as kanaalgroep_naam
  from dataloket.marketing_analyse_leads l;

comment on view dataloket.marketing_analyse_leads_soort is
  'Marketing analyse: alle leads (Van den Udenhout) met soort, internet (Kanaalgroep Internet) en website (udenhout.nl). Voor het leadoverzicht; het leadcijfer blijft uit marketing_analyse_leads_website.';

create or replace view dataloket.marketing_analyse_orders_type as
select o.ordersoort, o.klantgroep, coalesce(o.klantgroep, 'Geen klantgroep') as klantgroep_naam,
       o.merk, o.model, o.orderdatum, o.orderdatum_op,
       case
         when o.ordersoort = 'Handel' or o.klantgroep = 'Handel' then 'Handel'
         when o.klantgroep in ('Rent', 'Rentals ext') then 'Verhuur (Rent)'
         when o.klantgroep = 'Demo' then 'Demo'
         when o.klantgroep in ('Private lease', 'Private Groeilease', 'Cupra - Dealer Lease - Private Lease', 'Cupra - Uni Lease - Private Lease') then 'Private lease'
         when o.klantgroep in ('Dealer Lease', 'Lease', 'Occasion-Lease', 'Restmarge Dealer Lease', 'Cupra - Uni Lease - Zakelijk',
                               'Cupra - Dealer Lease - Zakelijk', 'Dealerlease Zakelijk_TB') then 'Zakelijke lease'
         when o.klantgroep in ('Koop Particulier (BM)', 'Cupra - BM ovg Particulier', 'PARTICULIER_TB') then 'Koop particulier'
         when o.klantgroep in ('Koop Zakelijk (BM)', 'Cupra - BM ovg Zakelijk', 'BEDRIJF_TB') then 'Koop zakelijk'
         else 'Overig'
       end as ordertype,
       o.ordersoort in ('Nieuw', 'Gebruikt') as klantorder
  from dataloket.marketing_analyse_orders o;

comment on view dataloket.marketing_analyse_orders_type is
  'Marketing analyse: alle orders (Van den Udenhout) met ordertype (indeling van de klantgroep). Voor het totaaloverzicht; de klantorders staan ook in marketing_analyse_orders_klant.';

grant select on dataloket.marketing_analyse_leads_soort to authenticated, service_role;
grant select on dataloket.marketing_analyse_orders_type to authenticated, service_role;
