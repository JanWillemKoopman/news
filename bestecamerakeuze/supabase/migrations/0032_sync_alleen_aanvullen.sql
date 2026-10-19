-- Een inhaalopdracht die alleen aanvult en nooit overschrijft.
--
-- WAAROM DIT BESTAAT
-- De knop "Data ophalen" op de pagina Website hoort de historie aan te vullen zonder
-- iets aan te raken wat er al staat: een rij die al in de tabel staat blijft precies zoals
-- hij is, alleen ontbrekende rijen komen erbij. Zo kan een handmatige ronde nooit cijfers
-- vervangen door een (mogelijk onvolledig of later herzien) antwoord van Windsor.
--
-- De nachtelijke sync blijft overschrijven, en dat is bewust: GA4 en de advertentie-
-- platforms herzien de cijfers van de afgelopen dagen nog (late toeschrijving), en dat
-- hoort de nacht mee te nemen. Geen van beide verwijdert ooit een rij.
--
-- De vlag staat op de opdracht en niet in het verzoek, omdat een lange ronde in schakels
-- loopt die de server zelf — of de cron, na een gebroken ketting — weer oppakt
-- (lib/windsor/keten.ts). Elke schakel moet dus van de opdracht zelf kunnen lezen hoe hij
-- moet schrijven.
alter table dataloket.sync_opdrachten
  add column if not exists alleen_aanvullen boolean not null default false;

comment on column dataloket.sync_opdrachten.alleen_aanvullen is
  'true: bestaande rijen blijven ongemoeid (insert … on conflict do nothing); alleen ontbrekende rijen worden toegevoegd. Gezet door de knop Data ophalen op de pagina Website.';
