-- Landingspagina-analyses verwijderen (kruisje in het overzicht op Monitoren → Landingspagina)
--
-- Alleen de twee beheeraccounts mogen een analyse weghalen — dezelfde twee die het
-- tabblad nu zien en analyses mogen starten (lib/gebruikersbeheer.ts: isBeheerder).
-- Het e-mailadres komt uit het JWT, net als in 0026_berichten_verwijderen.sql. De
-- DELETE-route controleert hetzelfde nog een keer.
drop policy if exists landingspagina_analyses_verwijderen on dataloket.landingspagina_analyses;
create policy landingspagina_analyses_verwijderen on dataloket.landingspagina_analyses
  for delete to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'koopman.janwillem@gmail.com',
      'jkoopman@udenhout.nl'
    )
  );

grant delete on dataloket.landingspagina_analyses to authenticated;
