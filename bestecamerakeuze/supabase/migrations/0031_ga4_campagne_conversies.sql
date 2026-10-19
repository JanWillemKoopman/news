-- GA-conversies per campagne: welke GA4-events tellen voor welke campagne, en het doel.
--
-- WAAROM DIT BESTAAT
-- De campagnetabel toont leads en orders uit de sheet, maar niet wat er op de website
-- gebeurde. Wat voor een campagne als "conversie" telt verschilt per campagne: bij de ene
-- is het een proefritaanvraag op de Audi-pagina's, bij de andere een offerte op één
-- actiepagina, of zelfs elke sessie die op de campagnepagina begon. Dat laat zich niet
-- afleiden, dus legt het team het per campagne vast op Campagnebeheer → Google Analytics.
--
-- ---------------------------------------------------------------------------
-- 1. Events × pagina — de kruising die 0025 bewust niet ophaalde
-- ---------------------------------------------------------------------------
--
-- 0025 haalt "welk event op welke pagina" niet op, omdat page_view, scroll,
-- user_engagement en first_visit op vrijwel elk pad vuren en de tabel daarmee van ±4.000
-- naar ruim 100.000 rijen per dag springt. Precies díe vier laat de sync hier weg (zie
-- GA4_EVENT_RUIS in lib/windsor/velden.ts). Wat overblijft zijn de events waar een
-- campagne op stuurt: formulieren, klikken, zoekacties, session_start. Gemeten op
-- udenhout.nl, de grootste property, op 14 oktober 2026: 3.862 rijen op één dag —
-- dezelfde orde als de andere GA4-tabellen.
--
-- session_start staat er wél in: "een sessie die op de campagnepagina begon" is voor een
-- campagne een volwaardig doel, en het is de enige manier om dat aan een pagina te hangen.
--
-- PAGINA EN QUERYSTRING
-- GA4 levert `pagePathPlusQueryString`. De sync splitst dat in `pagina` (het pad) en
-- `querystring` (alles na het vraagteken, zonder vraagteken), zodat er op allebei los te
-- filteren is — "pagina begint met /auto" én "querystring bevat merk=audi". De
-- trackingparameters (fbclid, gclid, msclkid, utm_…, M_BT, …) haalt de sync eruit vóór het
-- schrijven: die zijn per klik uniek, zeggen niets over de pagina en zouden van elke klik
-- een eigen rij maken. Zie `schoonQuerystring` in lib/windsor/sync.ts.
create table if not exists dataloket.windsor_ga4_event_paginas (
  datum        date not null,
  account_id   text not null,
  website      text,
  event_naam   text not null default '',
  pagina       text not null default '',
  querystring  text not null default '',
  kanaalgroep  text not null default '',
  campagne     text not null default '',  -- de utm-campagne van de sessie

  events       bigint not null default 0,
  conversies   numeric(12, 4) not null default 0,

  ingelezen_op timestamptz not null default now(),

  primary key (datum, account_id, event_naam, pagina, querystring, kanaalgroep, campagne)
);

comment on table dataloket.windsor_ga4_event_paginas is
  'Events per dag, per event-naam, pagina (pad), querystring, kanaalgroep en utm-campagne. Zonder page_view, scroll, user_engagement en first_visit. conversies > 0 betekent dat GA4 dit event als key event telt.';

create index if not exists windsor_ga4_event_paginas_periode_idx
  on dataloket.windsor_ga4_event_paginas (datum desc, account_id);

-- De telling per campagne begint altijd bij een handvol event-namen binnen de looptijd
-- (`bouwTelQuery` in lib/ga4Koppeling.ts). Met deze index leest hij alleen die rijen in
-- plaats van alle events van alle websites over die periode.
create index if not exists windsor_ga4_event_paginas_event_idx
  on dataloket.windsor_ga4_event_paginas (event_naam, datum);

create or replace view dataloket.v_ga4_event_paginas as
select datum, account_id, website, event_naam, pagina, querystring, kanaalgroep, campagne,
       events, conversies
  from dataloket.windsor_ga4_event_paginas;

comment on view dataloket.v_ga4_event_paginas is
  'Events per dag per pagina en querystring (zonder page_view, scroll, user_engagement en first_visit). Events tellen exact op over dagen en pagina''s.';

grant select on dataloket.v_ga4_event_paginas to dataloket_lezer;

-- ---------------------------------------------------------------------------
-- 2. De koppeling en het doel per campagne
-- ---------------------------------------------------------------------------
--
-- Gekoppeld op campagne_naam, net als campagne_cijfers (0018): de campagnes zelf staan in
-- de sheet, niet in deze database. Eén rij per campagne.
--
-- `regels` is een lijst; alles wat één van de regels matcht telt mee. Eén regel is
--   { "events": ["generate_lead_proefrit", "generate_lead_offerte"],
--     "voorwaarden": [{ "veld": "pagina", "operator": "bevat", "waarde": "/audi" }] }
-- — de events onderling "of", de voorwaarden onderling "en". De vorm wordt in de app
-- gecontroleerd (`controleerRegels` in lib/ga4Koppeling.ts) en niet hier: een check op
-- jsonb-vorm in SQL is onleesbaar en de app is de enige schrijver.
--
-- `doel_conversies` staat hier en niet in de sheet: het hoort bij de koppeling (zonder
-- koppeling zegt een doel niets) en zo hoeft de sheet geen kolom erbij.
create table if not exists dataloket.campagne_ga4_doelen (
  campagne_naam   text        primary key,
  doel_conversies numeric(12, 2) check (doel_conversies is null or doel_conversies >= 0),
  regels          jsonb       not null default '[]'::jsonb check (jsonb_typeof(regels) = 'array'),
  bijgewerkt_door uuid        not null,
  bijgewerkt_op   timestamptz not null default now()
);

comment on table dataloket.campagne_ga4_doelen is
  'Per campagne (naam uit de sheet): welke GA4-events als conversie tellen (regels) en het doel. Ingevuld op Campagnebeheer → Google Analytics en in de campagnetabel.';

alter table dataloket.campagne_ga4_doelen enable row level security;

-- Gedeeld, niet per gebruiker — zelfde afweging als campagne_cijfers.
drop policy if exists campagne_ga4_doelen_lezen on dataloket.campagne_ga4_doelen;
create policy campagne_ga4_doelen_lezen on dataloket.campagne_ga4_doelen
  for select to authenticated using (true);

drop policy if exists campagne_ga4_doelen_toevoegen on dataloket.campagne_ga4_doelen;
create policy campagne_ga4_doelen_toevoegen on dataloket.campagne_ga4_doelen
  for insert to authenticated with check (bijgewerkt_door = auth.uid());

drop policy if exists campagne_ga4_doelen_wijzigen on dataloket.campagne_ga4_doelen;
create policy campagne_ga4_doelen_wijzigen on dataloket.campagne_ga4_doelen
  for update to authenticated using (true) with check (bijgewerkt_door = auth.uid());

drop policy if exists campagne_ga4_doelen_verwijderen on dataloket.campagne_ga4_doelen;
create policy campagne_ga4_doelen_verwijderen on dataloket.campagne_ga4_doelen
  for delete to authenticated using (true);

grant select, insert, update, delete on dataloket.campagne_ga4_doelen to authenticated;

-- De chat leest met de read-only rol: "hoeveel GA-conversies heeft de Audi-campagne?" hoort
-- beantwoordbaar te zijn. Grant én policy, zie 0017.
grant select on dataloket.campagne_ga4_doelen to dataloket_lezer;

drop policy if exists campagne_ga4_doelen_lezen_rol on dataloket.campagne_ga4_doelen;
create policy campagne_ga4_doelen_lezen_rol on dataloket.campagne_ga4_doelen
  for select to dataloket_lezer using (true);
