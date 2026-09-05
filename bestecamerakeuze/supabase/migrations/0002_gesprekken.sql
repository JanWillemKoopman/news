-- Gespreksgeschiedenis: gesprekken, berichten en feedback.
--
-- Los van dataloket.query_log, dat bewust blijft bestaan: dat is het auditspoor
-- (wie vroeg wat, welke SQL draaide er, ging het goed). Dit hier is de productdata —
-- wat een collega terugziet als hij morgen zijn gesprek weer opent.

create table if not exists dataloket.gesprekken (
  id            uuid primary key default gen_random_uuid(),
  gebruiker_id  uuid        not null,
  titel         text        not null default 'Nieuw gesprek',
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  gearchiveerd  boolean     not null default false
);

create index if not exists gesprekken_gebruiker_idx
  on dataloket.gesprekken (gebruiker_id, bijgewerkt_op desc)
  where not gearchiveerd;

create table if not exists dataloket.berichten (
  id            bigserial primary key,
  gesprek_id    uuid        not null references dataloket.gesprekken (id) on delete cascade,
  rol           text        not null check (rol in ('gebruiker', 'assistent')),
  tekst         text        not null default '',
  -- De uitgevoerde queries mét hun weergave-instellingen, zodat een heropend gesprek
  -- exact dezelfde grafieken terugtoont in plaats van alleen kale tekst.
  queries       jsonb       not null default '[]'::jsonb,
  aangemaakt_op timestamptz not null default now()
);

create index if not exists berichten_gesprek_idx
  on dataloket.berichten (gesprek_id, id);

-- Duim omhoog/omlaag per antwoord. Dit is geen tevredenheidsmeting maar een werklijst:
-- een antwoord dat als fout is gemarkeerd, wijst bijna altijd op kennis die nog niet in
-- het datawoordenboek staat.
create table if not exists dataloket.feedback (
  bericht_id    bigint      not null references dataloket.berichten (id) on delete cascade,
  gebruiker_id  uuid        not null,
  oordeel       text        not null check (oordeel in ('goed', 'fout')),
  toelichting   text,
  aangemaakt_op timestamptz not null default now(),
  primary key (bericht_id, gebruiker_id)
);

-- ---------------------------------------------------------------------------
-- Rechten: iedereen ziet uitsluitend zijn eigen gesprekken
-- ---------------------------------------------------------------------------

alter table dataloket.gesprekken enable row level security;
alter table dataloket.berichten  enable row level security;
alter table dataloket.feedback   enable row level security;

drop policy if exists gesprekken_eigen on dataloket.gesprekken;
create policy gesprekken_eigen on dataloket.gesprekken
  for all to authenticated
  using (gebruiker_id = auth.uid())
  with check (gebruiker_id = auth.uid());

-- Berichten erven de eigenaar van hun gesprek.
drop policy if exists berichten_eigen on dataloket.berichten;
create policy berichten_eigen on dataloket.berichten
  for all to authenticated
  using (
    exists (
      select 1 from dataloket.gesprekken g
      where g.id = berichten.gesprek_id and g.gebruiker_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from dataloket.gesprekken g
      where g.id = berichten.gesprek_id and g.gebruiker_id = auth.uid()
    )
  );

drop policy if exists feedback_eigen on dataloket.feedback;
create policy feedback_eigen on dataloket.feedback
  for all to authenticated
  using (gebruiker_id = auth.uid())
  with check (gebruiker_id = auth.uid());

grant select, insert, update, delete on dataloket.gesprekken to authenticated;
grant select, insert, update, delete on dataloket.berichten  to authenticated;
grant select, insert, update, delete on dataloket.feedback   to authenticated;
grant usage, select on sequence dataloket.berichten_id_seq to authenticated;

-- Houdt de sorteervolgorde van de gesprekkenlijst kloppend zonder dat de applicatie
-- eraan hoeft te denken.
create or replace function dataloket.raak_gesprek_aan()
returns trigger
language plpgsql
security definer
set search_path = dataloket
as $$
begin
  update dataloket.gesprekken
     set bijgewerkt_op = now()
   where id = new.gesprek_id;
  return new;
end;
$$;

drop trigger if exists berichten_raakt_gesprek_aan on dataloket.berichten;
create trigger berichten_raakt_gesprek_aan
  after insert on dataloket.berichten
  for each row execute function dataloket.raak_gesprek_aan();
