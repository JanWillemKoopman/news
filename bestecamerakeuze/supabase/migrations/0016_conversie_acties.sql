-- Welke conversie-actie telt als lead?
--
-- WAAROM DIT BESTAAT
-- Google Ads levert geen apart leadveld. Wat een lead is, zit daar in de conversie-acties
-- die marketing zelf in Google Ads en GA4 heeft ingesteld: "Offerte aanvragen",
-- "Proefrit", "Bel-klik". De sync haalt die allemaal op, zet ze per rij in de
-- jsonb-kolom `conversie_acties` en houdt de catalogus bij in
-- `windsor_conversie_acties` (migratie 0014) — maar het dashboard deed er niets mee, met
-- als gevolg dat de kolom "Leads" op de Google Ads-pagina per definitie nul was.
--
-- WAAROM GEEN NIEUWE TABEL
-- De catalogus is er al, inclusief de `gewijzigd`-vlag die handmatige labels beschermt
-- tegen de volgende sync. Een tweede tabel ernaast zou een tweede waarheid zijn over
-- dezelfde velden. Er komt dus één kolom bij, plus het spoor van wie hem omzette.
alter table dataloket.windsor_conversie_acties
  add column if not exists telt_als_lead   boolean not null default false,
  add column if not exists bijgewerkt_door uuid,
  add column if not exists bijgewerkt_op   timestamptz;

comment on column dataloket.windsor_conversie_acties.telt_als_lead is
  'Telt deze conversie-actie mee in de leadkolom van de kanaalpagina''s? Handmatig gezet via Koppeltabel → Conversie-acties.';

-- De tabel had nog geen rijbeveiliging en geen rechten: hij werd tot nu toe alleen door
-- de sync geschreven, met een eigen verbinding. Nu leest het dashboard hem ook.
alter table dataloket.windsor_conversie_acties enable row level security;

-- Zelfde afweging als bij windsor_campagne_eigenaar: gedeelde kennis over de data, geen
-- persoonlijke instelling. Iedereen die is ingelogd mag lezen en bijstellen; toevoegen
-- doet alleen de sync, want de lijst komt uit de veldcatalogus van Windsor.
drop policy if exists windsor_conversie_lezen on dataloket.windsor_conversie_acties;
create policy windsor_conversie_lezen on dataloket.windsor_conversie_acties
  for select to authenticated using (true);

drop policy if exists windsor_conversie_wijzigen on dataloket.windsor_conversie_acties;
create policy windsor_conversie_wijzigen on dataloket.windsor_conversie_acties
  for update to authenticated using (true) with check (true);

grant select, update on dataloket.windsor_conversie_acties to authenticated;

-- De kanaalpagina's lezen de keuze met de read-only rol, om de leadtelling ermee op te
-- bouwen. Schrijven gaat via de Supabase-client met de sessie van de collega, net als bij
-- de koppeltabel.
grant select on dataloket.windsor_conversie_acties to dataloket_lezer;

-- ---------------------------------------------------------------------------
-- De catalogus mét het volume dat er daadwerkelijk doorheen kwam
-- ---------------------------------------------------------------------------
--
-- De catalogus zegt welke velden Windsor aanbiedt — dat zijn er tientallen, waarvan de
-- meeste bij dit account nooit vuren. Zonder het volume erbij is de keuzelijst een muur
-- van veldnamen waarin niemand de twee vindt die ertoe doen. Daarom deze view: één scan
-- over de laatste negentig dagen advertentiedata, en alleen de acties die iets deden of
-- die al zijn aangewezen (die laatste mogen nooit uit beeld verdwijnen, ook niet in een
-- rustige periode).
create or replace view dataloket.v_conversie_acties as
with gebruik as (
  select e.key                            as veld,
         sum((e.value)::text::numeric)    as aantal,
         min(w.account_naam)              as account,
         max(w.datum)                     as laatst_actief
    from dataloket.windsor_advertenties w
    cross join lateral jsonb_each(coalesce(w.conversie_acties, '{}'::jsonb)) as e(key, value)
   where w.datum >= current_date - interval '90 days'
   group by e.key
)
select a.veld,
       a.bron,
       a.label,
       a.telt_als_lead,
       a.gewijzigd,
       coalesce(g.aantal, 0)                     as aantal,
       g.account,
       coalesce(g.laatst_actief, a.laatst_gezien) as laatst_gezien
  from dataloket.windsor_conversie_acties a
  left join gebruik g on g.veld = a.veld
 where coalesce(g.aantal, 0) > 0 or a.telt_als_lead;

comment on view dataloket.v_conversie_acties is
  'De conversie-acties die de laatste 90 dagen daadwerkelijk voorkwamen (plus de al aangewezen acties), met hun volume. Voedt de keuzelijst op de pagina Koppeltabel. account is een aanwijzing: bij een actie die bij meerdere accounts voorkomt staat er één naam.';

grant select on dataloket.v_conversie_acties to dataloket_lezer;
