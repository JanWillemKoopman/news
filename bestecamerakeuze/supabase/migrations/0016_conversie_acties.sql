-- Welke conversie-actie telt als lead?
--
-- WAAROM DIT BESTAAT
-- Google Ads levert geen apart leadveld. Wat een lead is, zit daar in de conversie-acties
-- die marketing zelf in Google Ads en GA4 heeft ingesteld: "Offerte aanvragen",
-- "Proefrit", "Bel-klik". De sync haalt die allemaal op en zet ze per rij in de
-- jsonb-kolom `conversie_acties` (zie lib/windsor/velden.ts en sync.ts), maar tot nu toe
-- deed het dashboard er niets mee — met als gevolg dat de kolom "Leads" op de Google
-- Ads-pagina per definitie nul was.
--
-- Welke van die acties een lead is, is geen technische maar een marketingkeuze, en hij
-- verschilt per account en verandert als er een formulier bij komt. Dus: een tabel die
-- het team zelf beheert, net als de koppeltabel ernaast.
--
-- WAAROM ALLEEN HET VELD EN GEEN ACCOUNT
-- De veldnamen zijn al accountspecifiek — een conversie heet
-- `conversions_ga4_https_udenhout_nl_web_generate_lead_offerte` en die bestaat maar bij
-- één account. Een tweede sleutelkolom zou dus alleen maar extra regels opleveren die
-- allemaal hetzelfde zeggen.
create table if not exists dataloket.windsor_conversie_keuze (
  veld            text primary key,          -- de ruwe veldnaam uit de Windsor-catalogus
  telt_als_lead   boolean not null default false,
  -- Een eigen naam, als het automatisch afgeleide label ("Generate lead offerte") niet
  -- leest zoals het team het noemt. Leeg = het afgeleide label gebruiken.
  label           text,
  bijgewerkt_door uuid,
  bijgewerkt_op   timestamptz not null default now()
);

comment on table dataloket.windsor_conversie_keuze is
  'Per conversie-actie uit de advertentieplatforms: telt hij mee als lead, en onder welke naam. Handmatig beheerd via de pagina Koppeltabel.';

alter table dataloket.windsor_conversie_keuze enable row level security;

-- Zelfde afweging als bij windsor_campagne_eigenaar: gedeelde kennis over de data, geen
-- persoonlijke instelling. Iedereen die is ingelogd mag lezen en bijwerken.
drop policy if exists windsor_conversie_lezen on dataloket.windsor_conversie_keuze;
create policy windsor_conversie_lezen on dataloket.windsor_conversie_keuze
  for select to authenticated using (true);

drop policy if exists windsor_conversie_toevoegen on dataloket.windsor_conversie_keuze;
create policy windsor_conversie_toevoegen on dataloket.windsor_conversie_keuze
  for insert to authenticated with check (true);

drop policy if exists windsor_conversie_wijzigen on dataloket.windsor_conversie_keuze;
create policy windsor_conversie_wijzigen on dataloket.windsor_conversie_keuze
  for update to authenticated using (true) with check (true);

grant select, insert, update on dataloket.windsor_conversie_keuze to authenticated;

-- De kanaalpagina's lezen deze keuze met de read-only rol, om de leadtelling ermee op te
-- bouwen. Schrijven gaat via de Supabase-client met de sessie van de collega, net als bij
-- de koppeltabel.
grant select on dataloket.windsor_conversie_keuze to dataloket_lezer;

-- ---------------------------------------------------------------------------
-- De catalogus: welke conversie-acties komen er eigenlijk voor?
-- ---------------------------------------------------------------------------
--
-- Afgeleid uit de data en niet apart bijgehouden: de sync ontdekt de velden elke nacht
-- opnieuw uit de veldcatalogus van Windsor, en wat er in de laatste maanden daadwerkelijk
-- binnenkwam staat in `conversie_acties`. Een aparte tabel zou een tweede waarheid zijn
-- die achterloopt.
create or replace view dataloket.v_conversie_acties as
select
  e.key                              as veld,
  a.bron,
  min(a.account_naam)                as account,
  count(*)                           as rijen,
  sum((e.value)::text::numeric)      as aantal,
  max(a.datum)                       as laatst_gezien
from dataloket.windsor_advertenties a
cross join lateral jsonb_each(coalesce(a.conversie_acties, '{}'::jsonb)) as e(key, value)
where a.datum >= current_date - interval '90 days'
group by e.key, a.bron
having sum((e.value)::text::numeric) > 0;

comment on view dataloket.v_conversie_acties is
  'De conversie-acties die de laatste 90 dagen daadwerkelijk voorkwamen, met hun volume. Voedt de keuzelijst op de pagina Koppeltabel.';

grant select on dataloket.v_conversie_acties to dataloket_lezer;
