-- De openstaande inhaalopdracht van de Windsor-sync.
--
-- WAAROM DEZE TABEL BESTAAT
-- Een import van twaalf maanden past niet in één functie-aanroep: de sync knipt zo'n
-- periode in stukken van dertig dagen en stopt uit zichzelf voordat Vercel hem na
-- driehonderd seconden afkapt. Wat er dan nog te doen was, stond tot nu toe alleen in de
-- browser van degene die op "Data ophalen" had geklikt — een lokale variabele in de
-- rondenlus van DataOphalen.tsx. Wie het tabblad wegklikte, sloot daarmee het enige
-- geheugen van de opdracht af.
--
-- Dat is niet theoretisch gebleven. Op 14 september 2026 stond er een jaargrafiek met
-- uitgaven in september 2025 en vanaf juni 2026, en niets daartussen: de lopende ronde
-- had zichzelf netjes afgemaakt tot 18 januari 2026 en daarna hield het op, zonder dat
-- iets in beeld zei dat de rest nooit was opgehaald.
--
-- Met deze tabel staat het restant op de server. Dat maakt twee dingen mogelijk die
-- allebei nodig zijn: de route kan zichzelf doorschakelen naar de volgende schakel
-- zonder browser, en de nachtelijke cron kan onafgemaakt werk de volgende nacht alsnog
-- oppakken.
--
-- ÉÉN REGEL PER DEEL, NIET PER RONDE
-- `deel` is de sleutel: er is hooguit één openstaande opdracht per onderdeel. Een tweede
-- klik op "Data ophalen" overschrijft de opdracht in plaats van er een tweede naast te
-- zetten — twee kettingen die door dezelfde maanden lopen, leveren dezelfde upserts op
-- en kosten alleen tijd.
create table if not exists dataloket.sync_opdrachten (
  deel          text        primary key,     -- advertenties | organisch | account
  -- Het stuk van de periode dat nog te doen is; schuift met elke schakel op naar later.
  van           date        not null,
  tot           date        not null,
  -- Wat er oorspronkelijk gevraagd is, zodat de pagina kan tonen hoe ver de historie
  -- inmiddels terugloopt ten opzichte van wat er beloofd was.
  gevraagd_van  date        not null,
  gevraagd_tot  date        not null,
  -- Hoeveel schakels deze opdracht al heeft gekost. Een begrenzing, geen statistiek: een
  -- server die telkens hetzelfde restant teruggeeft hoort niet eindeloos door te gaan.
  schakels      integer     not null default 0,
  -- Hoeveel rijen deze opdracht in totaal heeft weggeschreven, opgeteld over de schakels.
  -- Feedback, geen boekhouding: zonder dit getal is "hij draait nog" niet te
  -- onderscheiden van "hij staat stil".
  rijen         integer     not null default 0,
  -- Tot wanneer deze opdracht geclaimd is door een draaiende schakel. Zo pakken twee
  -- kettingen (een klik en de cron, bijvoorbeeld) niet hetzelfde stuk tegelijk op. De
  -- claim verloopt vanzelf, want een functie die door Vercel wordt afgekapt komt nooit
  -- meer toe aan het vrijgeven ervan.
  bezig_tot     timestamptz,
  gestart_op    timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  -- Gevuld zodra het restant leeg is. Een afgeronde regel blijft staan: hij is het
  -- antwoord op "tot wanneer loopt onze historie en wanneer is dat opgehaald".
  afgerond_op   timestamptz,
  fout          text
);

comment on table dataloket.sync_opdrachten is
  'De openstaande inhaalopdracht per onderdeel van de Windsor-sync. Staat op de server zodat een lange import doorloopt zonder browser, en de cron onafgemaakt werk kan afmaken.';

-- Het dashboard leest de stand met de leesrol (DATAQUERY_DATABASE_URL) om te tonen hoe
-- ver de historie binnen is; schrijven gebeurt uitsluitend met SYNC_DATABASE_URL.
grant select on dataloket.sync_opdrachten to dataloket_lezer;
