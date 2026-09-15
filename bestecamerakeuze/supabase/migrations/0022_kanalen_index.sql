-- ---------------------------------------------------------------------------
-- LET OP: grotendeels teruggedraaid door 0023 — lees die eerst
-- ---------------------------------------------------------------------------
--
-- De diagnose hieronder klopt (de tabel was te zwaar om per rij te lezen), de oplossing
-- niet. De dekkende index bleek zelf duur: Postgres leest een indexregel attribuut voor
-- attribuut, dus bij twintig tekstkolommen wordt het lezen kwadratisch. Op Google viel
-- dat binnen de limiet, op Social ads niet. Migratie 0023 gooit deze index weer weg en
-- pakt het echte probleem aan: de creative-URL uit de rij halen. Dit bestand blijft
-- staan omdat de migratiegeschiedenis niet herschreven hoort te worden.

-- ---------------------------------------------------------------------------
-- De kanaalpagina's over twaalf maanden: van "statement timeout" naar seconden
-- ---------------------------------------------------------------------------
--
-- Symptoom: Google Ads gaf op "12 maanden" de melding
-- `canceling statement due to statement timeout`, terwijl 7, 30 en 90 dagen gewoon
-- laadden. Dat was geen grens die net niet gehaald werd maar een tabel die per rij te
-- duur is om te lezen.
--
-- Wat er aan de hand was. `windsor_advertenties` is 279 MB groot bij 248.000 rijen —
-- gemiddeld 785 bytes per rij, waarvan 537 bytes de kolom `thumbnail_url` is: de volledige
-- creative-URL van Meta, elke dag opnieuw meegeschreven bij elke advertentie. De
-- dashboardquery's hebben die kolom bij het optellen niet nodig, maar de bestaande index
-- (`..._periode_idx`, op `datum desc, bron, account_id`) draagt alleen de sleutel, dus
-- moest de database voor elke dagregel alsnog de volle rij van schijf halen. En omdat de
-- rijen van Meta en Google door elkaar heen op de pagina's staan, raakte een query die
-- alleen Google wil hebben vrijwel de hele 279 MB aan.
--
-- Gemeten op de productiedatabase, twaalf maanden Google, de advertentietabel:
--
--     oud                                              17,8 s   → over de limiet van 15 s
--     met deze index, zonder thumbnail in de optelling  1,4 s
--
-- En twaalf maanden Social (Meta + LinkedIn, 169.000 rijen), dat op hetzelfde probleem
-- afstevende: 7,0 s → 1,9 s (die laatste stap komt van `work_mem`, zie lib/kanalen/bron.ts).
--
-- De twee indexen hieronder horen bij elkaar met de query in `lib/kanalen/bron.ts`: de
-- eerste maakt het optellen een index only scan, de tweede haalt de thumbnail daarna
-- alleen nog op voor de regels die op het scherm komen.

-- ---------------------------------------------------------------------------
-- 1. De dekkende index voor het optellen
-- ---------------------------------------------------------------------------
--
-- `bron` staat vóór `datum` en niet andersom: elke kanaalpagina vraagt één bron (of twee)
-- over een periode, en met bron vooraan ligt zo'n periode aaneengesloten in de index in
-- plaats van uitgesmeerd over alle bronnen.
--
-- Alles wat de pagina's optellen of groeperen staat in `include`, zodat de tabel er niet
-- meer aan te pas komt. `thumbnail_url` staat er bewust NIET bij: die ene kolom zou de
-- index ruim drie keer zo groot maken en daarmee precies het probleem terugbrengen dat
-- hij oplost. `preview_url` (30 bytes) en `advertentie` (28 bytes) zijn wél klein genoeg.
--
-- Kosten: circa 82 MB. Dat is de prijs van een dashboard dat een jaar aankan.
create index if not exists windsor_advertenties_dashboard_idx
  on dataloket.windsor_advertenties (bron, datum)
  include (account_naam, platform, plaatsing, campagne, campagne_doel, campagne_status,
           adgroep, advertentie_id, advertentie, advertentie_status, preview_url,
           uitgaven, vertoningen, klikken, link_klikken, interacties, videoweergaven,
           leads, conversies, conversiewaarde, conversie_acties);

comment on index dataloket.windsor_advertenties_dashboard_idx is
  'Dekkende index voor de kanaalpagina''s: draagt alles wat er opgeteld wordt, zodat een periode-optelling de tabel (279 MB, grotendeels thumbnail-URL''s) niet hoeft te lezen.';

-- ---------------------------------------------------------------------------
-- 2. De thumbnail per advertentie
-- ---------------------------------------------------------------------------
--
-- Partieel op `thumbnail_url is not null`, en dat is hier het hele punt. Google-
-- advertenties hebben er nooit een; zonder deze voorwaarde loopt de opzoeking per Google-
-- advertentie een jaar aan dagregels door op zoek naar iets wat er niet is (gemeten 22 s
-- voor 728 advertenties). Met de voorwaarde in de index is dat antwoord meteen leeg.
create index if not exists windsor_advertenties_thumbnail_idx
  on dataloket.windsor_advertenties (advertentie_id, datum desc)
  where thumbnail_url is not null;

comment on index dataloket.windsor_advertenties_thumbnail_idx is
  'De nieuwste creative per advertentie, voor de advertentietabel. Partieel: Google levert geen thumbnails en hoort daar niet voor te hoeven zoeken.';

-- ---------------------------------------------------------------------------
-- 3. De zichtbaarheidskaart
-- ---------------------------------------------------------------------------
--
-- Een index only scan werkt alleen als Postgres weet dat een pagina voor iedereen
-- zichtbaar is, en dat weet hij pas na een vacuum. Direct na de nachtelijke sync, die
-- honderdduizenden rijen upsert, is dat voor de verse dagen even niet zo; autovacuum
-- haalt dat vanzelf in. Deze ene keer geven we hem een zetje, want anders blijft de
-- eerste dag na deze migratie traag.
--
-- `vacuum` kan niet in een transactie draaien en staat daarom niet in dit bestand: de
-- migratieloper voert een migratie als één transactie uit en zou erop stukvallen. Draai
-- hem één keer met de hand na deze migratie (op productie is dat al gebeurd):
--
--     vacuum (analyze) dataloket.windsor_advertenties;
