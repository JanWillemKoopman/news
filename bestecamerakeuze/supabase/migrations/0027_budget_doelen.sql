-- Budget en doel klikken per account, platform en maand
--
-- WAAROM DIT BESTAAT
-- De pagina Budget beheer (sidebargroep "Monitoren") zet de uitgaven en klikken van de
-- lopende maand naast wat er die maand mág worden uitgegeven en wat er moet binnenkomen.
-- De advertentieplatforms kennen dat budget en dat doel niet in een vorm die per maand
-- en per account vergelijkbaar is, dus legt het team het hier zelf vast.
--
-- WAAROM DEZE SLEUTEL
-- Account en platform zijn dezelfde twee dimensies als de filters op Social ads
-- (`account` = de accountnaam zoals `v_advertenties` hem toont, `platform` = facebook,
-- instagram, linkedin, …). Zo koppelt een regel hier zonder vertaaltabel aan de data.
-- `maand` is altijd de eerste dag van de maand; de check houdt dat vast, anders staan
-- 1 en 15 september straks als twee budgetten naast elkaar.
create table if not exists dataloket.budget_doelen (
  account         text not null,
  platform        text not null,
  maand           date not null check (maand = date_trunc('month', maand)::date),
  budget          numeric(12, 2) check (budget is null or budget >= 0),
  doel_klikken    bigint check (doel_klikken is null or doel_klikken >= 0),
  aangemaakt_door uuid,
  aangemaakt_op   timestamptz not null default now(),
  bijgewerkt_door uuid,
  bijgewerkt_op   timestamptz not null default now(),
  primary key (account, platform, maand)
);

comment on table dataloket.budget_doelen is
  'Maandbudget en doel aantal klikken per account en platform, handmatig ingevuld op de pagina Budget beheer. maand is altijd de eerste dag van de maand.';

alter table dataloket.budget_doelen enable row level security;

-- Gedeelde afspraak, geen persoonlijke instelling — zelfde afweging als de koppeltabel.
-- Wie wat invulde blijft herleidbaar via bijgewerkt_door.
drop policy if exists budget_doelen_lezen on dataloket.budget_doelen;
create policy budget_doelen_lezen on dataloket.budget_doelen
  for select to authenticated using (true);

drop policy if exists budget_doelen_toevoegen on dataloket.budget_doelen;
create policy budget_doelen_toevoegen on dataloket.budget_doelen
  for insert to authenticated with check (aangemaakt_door = auth.uid());

drop policy if exists budget_doelen_wijzigen on dataloket.budget_doelen;
create policy budget_doelen_wijzigen on dataloket.budget_doelen
  for update to authenticated using (true) with check (true);

drop policy if exists budget_doelen_verwijderen on dataloket.budget_doelen;
create policy budget_doelen_verwijderen on dataloket.budget_doelen
  for delete to authenticated using (true);

grant select, insert, update, delete on dataloket.budget_doelen to authenticated;

-- De chat leest met de read-only rol; een vraag als "liggen we deze maand op koers met
-- het budget van Instagram?" hoort beantwoordbaar te zijn. Grant én policy, zie 0017.
grant select on dataloket.budget_doelen to dataloket_lezer;

drop policy if exists budget_doelen_lezen_rol on dataloket.budget_doelen;
create policy budget_doelen_lezen_rol on dataloket.budget_doelen
  for select to dataloket_lezer using (true);

create or replace function dataloket.stempel_budget_doelen()
returns trigger
language plpgsql
security definer
set search_path = dataloket
as $$
begin
  new.bijgewerkt_op := now();
  return new;
end;
$$;

drop trigger if exists budget_doelen_stempel on dataloket.budget_doelen;
create trigger budget_doelen_stempel
  before update on dataloket.budget_doelen
  for each row execute function dataloket.stempel_budget_doelen();
