-- Marketing analyse: de orders-kopie, bron "Syntec orders".
--
-- Verzoek van de eigenaar (25 november 2026), zie campagne-analyse-tool.md §16: precies
-- dezelfde opzet als de leads-kopie (marketing_analyse_leads, migraties 0042 en 0047), maar
-- dan voor de verkochte auto's uit het sheet-tabblad "Data orders".
--
--  - vijf kolommen 1-op-1 zoals in de sheet: Ordersoort, Klantgroep, Merk, Model, Orderdatum,
--    plus Orderdatum als datum om op periode te filteren;
--  - de laatste 365 dagen (op Orderdatum); elke rij is één verkochte auto;
--  - elke nacht vervangen door /api/sync, eigen transactie en eigen regel in sync_runs
--    ("Marketing analyse orders"); filterlogica in lib/sync/analyseOrders.ts (getest).
--
-- De view marketing_analyse_orders_klant is de vaste telling voor een analyse: alleen de
-- verkoop aan klanten (Ordersoort Nieuw of Gebruikt, niet Handel) en een lege klantgroep als
-- "Geen klantgroep", zodat de uitsplitsing per klantgroep altijd optelt tot het totaal.
-- Dezelfde regel staat in TypeScript (isKlantOrder, klantgroepNaam); houd ze gelijk.

create table if not exists dataloket.marketing_analyse_orders (
  ordersoort     text,
  klantgroep     text,
  merk           text,
  model          text,
  -- 1-op-1 zoals in de sheet ("18-9-2026") …
  orderdatum     text,
  -- … en daarnaast als datum, om op periode te kunnen filteren.
  orderdatum_op  date
);

create index if not exists marketing_analyse_orders_datum_idx
  on dataloket.marketing_analyse_orders (orderdatum_op);

comment on table dataloket.marketing_analyse_orders is
  'Marketing analyse, bron "Syntec orders": nachtelijke kopie van het sheet-tabblad "Data orders" met vijf kolommen 1-op-1 (Ordersoort, Klantgroep, Merk, Model, Orderdatum), de laatste 365 dagen. Eén rij is één verkochte auto. Alleen van toepassing op Van den Udenhout. Voor de verkoop aan klanten: gebruik marketing_analyse_orders_klant.';

alter table dataloket.marketing_analyse_orders enable row level security;

drop policy if exists ma_orders_lezen on dataloket.marketing_analyse_orders;
create policy ma_orders_lezen on dataloket.marketing_analyse_orders
  for select to authenticated using (true);

grant select on dataloket.marketing_analyse_orders to authenticated;
grant all on dataloket.marketing_analyse_orders to service_role;

create or replace view dataloket.marketing_analyse_orders_klant
  with (security_invoker = true) as
select
  o.ordersoort,
  o.klantgroep,
  coalesce(o.klantgroep, 'Geen klantgroep') as klantgroep_naam,
  o.merk,
  o.model,
  o.orderdatum,
  o.orderdatum_op
from dataloket.marketing_analyse_orders o
where o.ordersoort in ('Nieuw', 'Gebruikt');

comment on view dataloket.marketing_analyse_orders_klant is
  'Marketing analyse, bron "Syntec orders": de verkochte auto''s aan klanten (Ordersoort Nieuw of Gebruikt, zonder Handel), met klantgroep_naam ("Geen klantgroep" als hij leeg is). Eén rij is één auto. Alleen van toepassing op Van den Udenhout.';

grant select on dataloket.marketing_analyse_orders_klant to authenticated, service_role;
