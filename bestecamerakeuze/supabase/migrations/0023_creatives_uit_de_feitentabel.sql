-- ---------------------------------------------------------------------------
-- De creative uit de feitentabel, en de dekkende index weer weg
-- ---------------------------------------------------------------------------
--
-- Migratie 0022 loste de timeout op Google Ads op met een dekkende index, en dat werkte
-- daar (17,8 s → 1,4 s). Op Social ads bleef de melding staan, en de meting waarom legt
-- een fout in 0022 zelf bloot.
--
-- Wat 0022 over het hoofd zag. Een index only scan haalt zijn kolommen niet uit de rij
-- maar uit de indexregel, en Postgres leest een indexregel attribuut voor attribuut:
-- elke kolom van variabele lengte moet hij van voor af aan doorlopen om de volgende te
-- vinden. Bij twintig zulke kolommen wordt dat kwadratisch. Gemeten op dezelfde 169.000
-- rijen van Social ads:
--
--     tellen via de smalle index (..._periode_idx)                    0,75 s
--     één kolom lezen via de dekkende index (..._dashboard_idx)       8,42 s
--
-- Dezelfde rijen, dezelfde machine, elf keer zo duur — en dat voor één kolom. De
-- dekkende index was dus geen versnelling maar een tweede, duurdere omweg; hij viel
-- alleen niet op bij Google (92.000 rijen) omdat die net binnen de limiet bleef.
--
-- Wat er wél aan de hand is. `windsor_advertenties` weegt 283 MB bij 248.000 rijen, en
-- 537 van de gemiddeld 785 bytes per rij zijn `thumbnail_url`. Die kolom bevat
-- **935 verschillende waarden**, weggeschreven in zo'n 180.000 rijen: de creative-URL
-- hoort bij de advertentie en verandert niet per dag, maar hij stond wel elke dag
-- opnieuw in de rij. Daardoor past de tabel niet in het werkgeheugen van de database
-- (shared_buffers is 224 MB) en moet elke jaaroptelling hem van schijf halen.
--
-- Deze migratie haalt die kolom uit de feitentabel en zet hem in een eigen tabel met één
-- rij per advertentie. Daarna is de gewone weg — de rij lezen via een smalle index —
-- weer de snelste, want een rij lezen is één doorloop en geen doorloop per kolom.
-- Gemeten op een kopie zonder die kolom (116 MB in plaats van 283 MB):
--
--     Social ads, twaalf maanden, tijdreeks       7,0 s  →  0,48 s
--     Social ads, twaalf maanden, tabel           1,9 s  →  0,59 s
--
-- De les voor later: een dekkende index met veel tekstkolommen is geen gratis
-- versnelling. Maak eerst de rij smal; pas als dat niet kan, is een index met een
-- hándvol kolommen erin het overwegen waard.

-- ---------------------------------------------------------------------------
-- 1. De creative krijgt een eigen tabel
-- ---------------------------------------------------------------------------
--
-- Op (bron, advertentie_id) en niet op advertentie_id alleen: de id's komen van
-- verschillende platforms en niets garandeert dat ze elkaar niet overlappen.
create table if not exists dataloket.windsor_advertentie_creatives (
  bron           text not null,
  advertentie_id text not null,
  thumbnail_url  text,
  bijgewerkt_op  timestamptz not null default now(),
  primary key (bron, advertentie_id)
);

comment on table dataloket.windsor_advertentie_creatives is
  'De creative-URL per advertentie. Staat hier en niet in windsor_advertenties omdat hij bij de advertentie hoort en niet bij de dag: 935 waarden tegenover 180.000 rijen, en tweederde van het gewicht van de feitentabel.';

-- De nieuwste die we van een advertentie kennen. `distinct on` met dezelfde volgorde als
-- de order by: dat is de rij die per (bron, advertentie_id) bovenaan komt.
insert into dataloket.windsor_advertentie_creatives (bron, advertentie_id, thumbnail_url)
select distinct on (bron, advertentie_id) bron, advertentie_id, thumbnail_url
  from dataloket.windsor_advertenties
 where thumbnail_url is not null and advertentie_id <> ''
 order by bron, advertentie_id, datum desc
    on conflict (bron, advertentie_id) do update set thumbnail_url = excluded.thumbnail_url;

-- ---------------------------------------------------------------------------
-- 2. De view houdt dezelfde kolommen
-- ---------------------------------------------------------------------------
--
-- Belangrijk voor alles wat níet het dashboard is: de chatbot leest dezelfde view, en
-- die hoort van deze verhuizing niets te merken. `v_advertenties` levert
-- `thumbnail_url` dus nog steeds — nu uit de join in plaats van uit de rij.
--
-- De view moet eerst vallen omdat hij op de kolom hieronder leunt.
drop view if exists dataloket.v_advertenties;

alter table dataloket.windsor_advertenties drop column if exists thumbnail_url;

create or replace view dataloket.v_advertenties as
select
  a.datum,
  a.bron,
  a.account_id,
  a.account_naam            as account,
  a.platform,
  a.plaatsing,
  a.campagne_id,
  a.campagne,
  a.campagne_doel,
  a.campagne_status,
  a.adgroep,
  a.advertentie_id,
  a.advertentie,
  a.advertentie_status,
  c.thumbnail_url,
  a.preview_url,
  a.bestemming_url,
  coalesce(k.eigenaar_naam, '—')  as campagnemanager,
  k.merk,
  k.categorie,
  a.uitgaven,
  a.vertoningen,
  a.bereik,
  a.klikken,
  a.link_klikken,
  a.interacties,
  a.videoweergaven,
  a.leads,
  a.conversies,
  a.conversiewaarde,
  a.conversie_acties
from dataloket.windsor_advertenties a
left join dataloket.windsor_campagne_eigenaar k on k.campagne = a.campagne
left join dataloket.windsor_advertentie_creatives c
       on c.bron = a.bron and c.advertentie_id = a.advertentie_id;

comment on view dataloket.v_advertenties is
  'Betaalde advertentieprestaties per dag, verrijkt met de koppeltabel en de creative. Platform zegt waar de advertentie draaide; bron zegt uit welk advertentieplatform hij kwam.';

-- De creatives ook los leesbaar, zodat de advertentietabel de plaatjes in één keer kan
-- ophalen voor de regels die hij toont — in plaats van ze door de optelling te slepen.
create or replace view dataloket.v_advertentie_creatives as
select bron, advertentie_id, thumbnail_url
  from dataloket.windsor_advertentie_creatives;

comment on view dataloket.v_advertentie_creatives is
  'Eén creative per advertentie, voor de advertentietabel op de kanaalpagina''s.';

-- ---------------------------------------------------------------------------
-- 3. De dekkende index eruit, een smalle ervoor in de plaats
-- ---------------------------------------------------------------------------
--
-- `..._dashboard_idx` (93 MB) was de omweg uit 0022 en is nu schadelijk: de planner
-- kiest hem, en dan betaalt elke rij opnieuw de doorloop per kolom. Weg ermee.
-- `..._thumbnail_idx` heeft geen werk meer nu de creatives een eigen tabel hebben.
drop index if exists dataloket.windsor_advertenties_dashboard_idx;
drop index if exists dataloket.windsor_advertenties_thumbnail_idx;

-- Bron vooraan, datum erachter: elke kanaalpagina vraagt één bron (of twee) over een
-- periode, en zo ligt zo'n periode aaneengesloten in de index.
create index if not exists windsor_advertenties_bron_datum_idx
  on dataloket.windsor_advertenties (bron, datum);

comment on index dataloket.windsor_advertenties_bron_datum_idx is
  'De index die de kanaalpagina''s dragen: bron eerst, dan datum. Bewust smal — zie de toelichting boven in migratie 0023.';

grant select on dataloket.v_advertenties to dataloket_lezer;
grant select on dataloket.v_advertentie_creatives to dataloket_lezer;

-- ---------------------------------------------------------------------------
-- 4. Daarna, met de hand
-- ---------------------------------------------------------------------------
--
-- `drop column` markeert de kolom alleen als vervallen; de bytes blijven in de rijen
-- staan tot de tabel herschreven wordt. Zolang dat niet gebeurd is, weegt de tabel nog
-- steeds 283 MB en verandert er aan de snelheid niets. `vacuum full` kan niet in een
-- transactie en staat daarom niet in dit bestand; hij neemt de tabel een minuut of twee
-- exclusief in beslag, dus draai hem buiten de nachtelijke sync om:
--
--     vacuum full dataloket.windsor_advertenties;
--     analyze dataloket.windsor_advertenties;
