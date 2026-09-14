-- Handmatig cijfer (0-10) per campagne, zoals het team dat wekelijks zelf toekent in het
-- overleg. Net als de aantekeningen (0005_campagne_notities.sql) gekoppeld op
-- campagne_naam, niet op een campagne-id — de campagnes zelf komen uit de Google Sheet en
-- hebben geen database-record.
--
-- Eén rij per campagne (campagne_naam is de primary key): het is een huidige stand, geen
-- geschiedenis van cijfers zoals bij de aantekeningen. Gedeeld en niet per gebruiker, met
-- wie het cijfer als laatste zette zichtbaar via aangepast_door.

create table if not exists dataloket.campagne_cijfers (
  campagne_naam   text        primary key,
  cijfer          smallint    not null check (cijfer between 0 and 10),
  aangepast_door  uuid        not null,
  aangepast_op    timestamptz not null default now()
);

comment on table dataloket.campagne_cijfers is
  'Handmatig campagnecijfer (0-10), één per campagne. Gekoppeld op campagne_naam (de naam uit de sheet), niet op een id.';

alter table dataloket.campagne_cijfers enable row level security;

drop policy if exists campagne_cijfers_lezen on dataloket.campagne_cijfers;
create policy campagne_cijfers_lezen on dataloket.campagne_cijfers
  for select to authenticated using (true);

drop policy if exists campagne_cijfers_toevoegen on dataloket.campagne_cijfers;
create policy campagne_cijfers_toevoegen on dataloket.campagne_cijfers
  for insert to authenticated with check (aangepast_door = auth.uid());

drop policy if exists campagne_cijfers_wijzigen on dataloket.campagne_cijfers;
create policy campagne_cijfers_wijzigen on dataloket.campagne_cijfers
  for update to authenticated using (true) with check (true);

drop policy if exists campagne_cijfers_verwijderen on dataloket.campagne_cijfers;
create policy campagne_cijfers_verwijderen on dataloket.campagne_cijfers
  for delete to authenticated using (true);

grant select, insert, update, delete on dataloket.campagne_cijfers to authenticated;
