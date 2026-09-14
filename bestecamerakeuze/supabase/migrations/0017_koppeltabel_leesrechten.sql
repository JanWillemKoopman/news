-- De koppeltabel leesbaar maken voor de read-only rol
--
-- WAT ER MISGING
-- De pagina Koppeltabel viel om met "permission denied for table
-- windsor_campagne_eigenaar". De pagina leest de kanaaldata met de read-only rol
-- `dataloket_lezer` (DATAQUERY_DATABASE_URL, zie lib/kanalen/bron.ts), maar migratie 0014
-- gaf de koppeltabel alleen rechten aan `authenticated` — die rol hoort bij de
-- Supabase-client, waarmee alleen het opslaan gaat.
--
-- TWEE DINGEN ZIJN NODIG
-- Een grant alleen is niet genoeg: beide tabellen hebben rijbeveiliging aan, en hun
-- policies gelden uitsluitend `to authenticated`. Zonder policy voor de leesrol levert de
-- grant een lege tabel op in plaats van een foutmelding — wat bij
-- `windsor_conversie_acties` ook daadwerkelijk gebeurde: die had de grant al (0016), maar
-- geen policy, waardoor de leadvelden voor de kanaalpagina's altijd leeg terugkwamen en
-- de leadkolom op nul bleef staan. Daarom hier allebei: grant én een leespolicy.
--
-- Lezen, niet meer dan dat. Schrijven blijft lopen via de Supabase-client met de sessie
-- van de collega zelf, zodat `bijgewerkt_door` blijft kloppen.
grant select on dataloket.windsor_campagne_eigenaar to dataloket_lezer;

drop policy if exists windsor_eigenaar_lezen_rol on dataloket.windsor_campagne_eigenaar;
create policy windsor_eigenaar_lezen_rol on dataloket.windsor_campagne_eigenaar
  for select to dataloket_lezer using (true);

drop policy if exists windsor_conversie_lezen_rol on dataloket.windsor_conversie_acties;
create policy windsor_conversie_lezen_rol on dataloket.windsor_conversie_acties
  for select to dataloket_lezer using (true);
