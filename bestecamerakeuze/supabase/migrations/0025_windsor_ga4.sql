-- De website: Google Analytics 4 via Windsor.ai.
--
-- WAAROM VIER TABELLEN EN NIET ÉÉN
-- GA4 kent geen enkele tabel waarin alles tegelijk past. Een paginaweergave hoort bij een
-- pagina, een instap hoort bij een landingspagina én de sessie die daar begon, een event
-- hoort bij een event-naam, en de herkomst hoort bij de sessie. Wie die vier in één tabel
-- perst, vermenigvuldigt de rijen met elkaar: pagina × event × campagne × dag levert voor
-- één dealerwebsite al tienduizenden rijen per dag op, en elke optelling erover telt
-- dezelfde sessie meerdere keren. Vier korrels, vier tabellen — dezelfde afweging als in
-- 0014 tussen advertenties, posts en accountcijfers.
--
-- WAT ELKE TABEL KAN BEANTWOORDEN
--   verkeer          waar komt het verkeer vandaan, en hoeveel is het (de tijdreeks)
--   landingspaginas  waar stapten mensen binnen, en via welk kanaal
--   paginas          welke pagina's zijn bekeken, en wat gebeurde daar
--   events           welke events en key events vuurden, en via welk kanaal
--
-- WAT ER BEWUST NIET IS: EVENT × PAGINA
-- "Welk event vuurde op welke pagina" is de kruising die GA4 wél aanbiedt en die wij niet
-- ophalen. Reden: een dealersite heeft duizenden paden en tientallen events, en vrijwel
-- elk pad vuurt page_view, user_engagement, scroll en session_start. Gemeten op de
-- grootste property is dat de sprong van ±4.000 naar ruim 100.000 rijen per dag — en dan
-- praten we over één van de zestien properties. Wat er wél is: per pagina hoeveel events
-- en hoeveel key events er vuurden (windsor_ga4_paginas), en per event-naam hoe vaak hij
-- vuurde (windsor_ga4_events). De namen per pagina ontbreken dus; dat is een keuze, geen
-- omissie.
--
-- LET OP BIJ GEBRUIKERS
-- `gebruikers` is een ontdubbeld aantal per dag. Optellen over dagen telt iemand die op
-- drie dagen kwam drie keer, precies zoals bereik dat doet bij de advertenties (zie
-- lib/windsor/velden.ts). Het cijfer staat er wél, anders is de meest gestelde vraag van
-- GA4 niet te beantwoorden, maar het dashboard zegt er expliciet bij wat het is. Wat wél
-- exact optelt: sessies, nieuwe gebruikers, weergaven, events en conversies.

-- ---------------------------------------------------------------------------
-- Verkeer — dag × website × kanaalgroep × bron/medium × campagne × apparaat
-- ---------------------------------------------------------------------------
--
-- De sessie-scope: alle vier de dimensies hieronder beschrijven waar de sessie vandaan
-- kwam, niet wat er daarna gebeurde. Daarom kan dit één tabel zijn zonder dubbeltelling:
-- een sessie zit in precies één combinatie.
create table if not exists dataloket.windsor_ga4_verkeer (
  datum              date not null,
  account_id         text not null,           -- de GA4-property
  website            text,                    -- leesbare naam van die property
  -- Deze vier zitten in de primary key en zijn daarom `not null default ''`: in Postgres
  -- telt elke NULL als uniek, dus twee rijen met een leeg kanaal zouden naast elkaar
  -- blijven staan in plaats van elkaar te overschrijven — en dan verdubbelt de upsert
  -- stilletjes. Dezelfde reden als bij `plaatsing` in windsor_advertenties.
  kanaalgroep        text not null default '', -- session_default_channel_group
  bron_medium        text not null default '', -- session_source_medium
  campagne           text not null default '',
  apparaat           text not null default '', -- desktop | mobile | tablet

  sessies            bigint not null default 0,
  gebruikers         bigint not null default 0,  -- ontdubbeld per dag, zie de kop
  nieuwe_gebruikers  bigint not null default 0,
  betrokken_sessies  bigint not null default 0,
  weergaven          bigint not null default 0,
  conversies         numeric(12, 4) not null default 0,
  betrokkenheidstijd bigint not null default 0,  -- seconden, opgeteld over de gebruikers

  ingelezen_op       timestamptz not null default now(),

  primary key (datum, account_id, kanaalgroep, bron_medium, campagne, apparaat)
);

comment on table dataloket.windsor_ga4_verkeer is
  'Websiteverkeer per dag uit GA4, uitgesplitst naar kanaalgroep, bron/medium, campagne en apparaat. Sessies en nieuwe gebruikers tellen exact op over dagen; gebruikers is per dag ontdubbeld en telt dus dubbel over een langere periode.';

create index if not exists windsor_ga4_verkeer_periode_idx
  on dataloket.windsor_ga4_verkeer (datum desc, account_id);

-- ---------------------------------------------------------------------------
-- Landingspagina's — dag × website × landingspagina × kanaalgroep × campagne
-- ---------------------------------------------------------------------------
--
-- Het instappunt: `sessies` op deze korrel ís het aantal mensen dat hier binnenkwam. Het
-- kanaal en de campagne staan erbij omdat dat de vraag is die erachteraan komt — een
-- campagnelandingspagina zonder te weten via welk kanaal er is ingestapt, zegt niets.
--
-- Bron/medium staat er bewust níet bij. Dat zou de rijen ruim verdubbelen (gemeten: 946
-- naar 2.100 rijen per dag op de grootste property) terwijl de kanaalgroep dezelfde vraag
-- op het juiste niveau beantwoordt; wie de exacte bron wil, leest de verkeertabel.
create table if not exists dataloket.windsor_ga4_landingspaginas (
  datum             date not null,
  account_id        text not null,
  website           text,
  landingspagina    text not null default '',
  kanaalgroep       text not null default '',
  campagne          text not null default '',

  sessies           bigint not null default 0,  -- de instappen
  gebruikers        bigint not null default 0,
  nieuwe_gebruikers bigint not null default 0,
  betrokken_sessies bigint not null default 0,
  conversies        numeric(12, 4) not null default 0,

  ingelezen_op      timestamptz not null default now(),

  primary key (datum, account_id, landingspagina, kanaalgroep, campagne)
);

comment on table dataloket.windsor_ga4_landingspaginas is
  'Instappunten per dag: op welke pagina een sessie begon, via welk kanaal en welke campagne. Sessies is hier het aantal instappen.';

create index if not exists windsor_ga4_landingspaginas_periode_idx
  on dataloket.windsor_ga4_landingspaginas (datum desc, account_id);

-- ---------------------------------------------------------------------------
-- Pagina's — dag × website × pagina × kanaalgroep
-- ---------------------------------------------------------------------------
--
-- Wat er ná de instap gebeurt. De kanaalgroep staat erbij zodat een filter op "Paid
-- Search" ook deze tabel meeneemt; zonder die kolom zou de pagina onder een actief
-- kanaalfilter stilletjes het complete beeld blijven tonen.
--
-- `sessies` en `gebruikers` zijn hier sessie-scope op een event-scope korrel: ze tellen
-- niet op over pagina's (dezelfde sessie raakt tien pagina's). `weergaven`, `events` en
-- `conversies` doen dat wél. De statistieklijst in lib/windsor/velden.ts zegt dat per
-- cijfer met zoveel woorden.
create table if not exists dataloket.windsor_ga4_paginas (
  datum              date not null,
  account_id         text not null,
  website            text,
  pagina             text not null default '',
  kanaalgroep        text not null default '',

  weergaven          bigint not null default 0,
  gebruikers         bigint not null default 0,
  sessies            bigint not null default 0,
  events             bigint not null default 0,
  conversies         numeric(12, 4) not null default 0,
  betrokkenheidstijd bigint not null default 0,

  ingelezen_op       timestamptz not null default now(),

  primary key (datum, account_id, pagina, kanaalgroep)
);

comment on table dataloket.windsor_ga4_paginas is
  'Paginaweergaven per dag, per pagina en kanaalgroep. Weergaven, events en conversies tellen op over pagina''s; sessies en gebruikers niet — dezelfde sessie raakt meerdere pagina''s.';

create index if not exists windsor_ga4_paginas_periode_idx
  on dataloket.windsor_ga4_paginas (datum desc, account_id);

-- ---------------------------------------------------------------------------
-- Events — dag × website × event × kanaalgroep
-- ---------------------------------------------------------------------------
--
-- `conversies` is hier het aantal keer dat dit event als key event telde. Staat er een
-- getal, dan is het event in GA4 als key event aangemerkt; staat er nul, dan is het een
-- gewoon event. Het dashboard leidt daar zijn tweedeling uit af in plaats van een lijst
-- met key events apart bij te houden — die lijst zou een tweede waarheid zijn over iets
-- wat GA4 zelf al weet.
create table if not exists dataloket.windsor_ga4_events (
  datum       date not null,
  account_id  text not null,
  website     text,
  event_naam  text not null default '',
  kanaalgroep text not null default '',

  events      bigint not null default 0,
  gebruikers  bigint not null default 0,
  conversies  numeric(12, 4) not null default 0,

  ingelezen_op timestamptz not null default now(),

  primary key (datum, account_id, event_naam, kanaalgroep)
);

comment on table dataloket.windsor_ga4_events is
  'Events per dag, per event-naam en kanaalgroep. conversies > 0 betekent dat GA4 dit event als key event telt.';

create index if not exists windsor_ga4_events_periode_idx
  on dataloket.windsor_ga4_events (datum desc, account_id);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
--
-- Dezelfde afspraak als bij de andere Windsor-tabellen: de app en de chat lezen
-- uitsluitend de v_-views met de rol dataloket_lezer, nooit de tabellen zelf.
create or replace view dataloket.v_ga4_verkeer as
select datum, account_id, website, kanaalgroep, bron_medium, campagne, apparaat,
       sessies, gebruikers, nieuwe_gebruikers, betrokken_sessies, weergaven,
       conversies, betrokkenheidstijd
  from dataloket.windsor_ga4_verkeer;

comment on view dataloket.v_ga4_verkeer is
  'Websiteverkeer per dag uit GA4. Sessies en nieuwe gebruikers tellen exact op over dagen; gebruikers is per dag ontdubbeld.';

create or replace view dataloket.v_ga4_landingspaginas as
select datum, account_id, website, landingspagina, kanaalgroep, campagne,
       sessies, gebruikers, nieuwe_gebruikers, betrokken_sessies, conversies
  from dataloket.windsor_ga4_landingspaginas;

comment on view dataloket.v_ga4_landingspaginas is
  'Instappunten per dag: sessies is het aantal keer dat een bezoek op deze pagina begon.';

create or replace view dataloket.v_ga4_paginas as
select datum, account_id, website, pagina, kanaalgroep,
       weergaven, gebruikers, sessies, events, conversies, betrokkenheidstijd
  from dataloket.windsor_ga4_paginas;

comment on view dataloket.v_ga4_paginas is
  'Paginaweergaven per dag. Weergaven, events en conversies tellen op over pagina''s; sessies en gebruikers niet.';

create or replace view dataloket.v_ga4_events as
select datum, account_id, website, event_naam, kanaalgroep,
       events, gebruikers, conversies
  from dataloket.windsor_ga4_events;

comment on view dataloket.v_ga4_events is
  'Events per dag. conversies > 0 betekent dat GA4 dit event als key event telt.';

grant select on dataloket.v_ga4_verkeer to dataloket_lezer;
grant select on dataloket.v_ga4_landingspaginas to dataloket_lezer;
grant select on dataloket.v_ga4_paginas to dataloket_lezer;
grant select on dataloket.v_ga4_events to dataloket_lezer;
