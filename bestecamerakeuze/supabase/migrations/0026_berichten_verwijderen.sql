-- Verwijderen van berichten: de schrijver zelf, plus de twee beheeraccounts
--
-- Tot nu toe mocht elke ingelogde collega elk bericht weggooien (migratie 0005:
-- `for delete to authenticated using (true)`). Dat paste bij een lijst losse
-- aantekeningen, maar een bericht is sindsdien meer geworden: het telt mee in de
-- weekstand, de streak en de prijzenkast op het scoretabblad. Andermans bericht
-- weghalen verandert dus andermans stand.
--
-- De nieuwe regel: je eigen berichten mag je altijd opruimen, en daarnaast mogen
-- koopman.janwillem@gmail.com en jkoopman@udenhout.nl berichten van iedereen
-- verwijderen — dezelfde twee accounts die bij Instellingen → Gebruikers de
-- beheerdersrechten hebben (lib/gebruikersbeheer.ts: isBeheerder).
--
-- Waarom hier hardgecodeerd en niet als rol-vlag in een tabel: het zijn twee vaste,
-- bij naam bekende accounts, net als in lib/gebruikersbeheer.ts. Komt er ooit een
-- derde beheerder bij, dan veranderen die twee plekken samen — zoek op het e-mailadres
-- en je vindt ze allebei.
--
-- Het e-mailadres komt uit het JWT van de ingelogde gebruiker (`auth.jwt()`), niet uit
-- een kolom die de client kan meesturen. Lezen, toevoegen en wijzigen blijven
-- ongemoeid: dit gaat alleen over weggooien.

drop policy if exists campagne_notities_verwijderen on dataloket.campagne_notities;
create policy campagne_notities_verwijderen on dataloket.campagne_notities
  for delete to authenticated
  using (
    aangemaakt_door = auth.uid()
    or lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'koopman.janwillem@gmail.com',
      'jkoopman@udenhout.nl'
    )
  );
