-- Zelf kiezen wélke onderdelen een inhaalronde ophaalt.
--
-- WAAROM DIT NODIG IS
-- De ketting (lib/windsor/keten.ts) kijkt niet naar wie hem gestart heeft: hij claimt
-- simpelweg de eerstvolgende opdracht die nog openstaat. Zolang "Data ophalen" altijd
-- alle vier de onderdelen klaarzette, klopte dat precies.
--
-- Vanaf nu kun je in het dashboard aanvinken wat je wilt ophalen, en dan klopt het niet
-- meer. Op 15 september 2026 stond de website op nul rijen historie terwijl de
-- advertenties compleet binnen waren; wie dan alleen de website aanvinkt, bedoelt ook
-- echt alleen de website. Zonder deze kolom zou de ketting alsnog de openstaande
-- organische opdracht van diezelfde ronde oppakken en een kwartier lang maanden
-- ophalen die er al stonden.
--
-- WAAROM EEN VLAG EN GEEN VERWIJDERDE REGEL
-- Een opdracht die je deze ronde overslaat, is niet hetzelfde als een opdracht die klaar
-- is. De regel blijft staan met alles wat erin zit — tot waar de historie loopt, hoeveel
-- rijen het waren, wanneer het misging — en het dashboard toont hem als "niet
-- meegenomen" in plaats van hem stilletjes te laten verdwijnen of als afgerond te tellen.
-- Aanvinken bij een volgende ronde maakt hem gewoon weer actief.
--
-- De nachtelijke cron (`/api/windsor-sync?deel=...`) gebruikt deze tabel niet; die haalt
-- zijn dertig dagen los van elke opdracht op. Een overgeslagen onderdeel blijft dus
-- gewoon elke nacht bijgewerkt — alleen de inhaalhistorie wacht.
alter table dataloket.sync_opdrachten
  add column if not exists actief boolean not null default true;

comment on column dataloket.sync_opdrachten.actief is
  'Doet dit onderdeel mee in de lopende inhaalronde? De ketting claimt uitsluitend actieve opdrachten; een overgeslagen onderdeel behoudt zijn stand en kan later weer aangevinkt worden.';
