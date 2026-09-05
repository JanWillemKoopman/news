-- Dataloket: schema, voorbeeldtabel, views, querylog en de read-only rol.
--
-- Draai dit in de Supabase SQL-editor of via `supabase db push`. De voorbeeldtabel
-- onderaan mag weg zodra de echte sheets gekoppeld zijn — de rest blijft staan.

create schema if not exists dataloket;

-- ---------------------------------------------------------------------------
-- Sync: wat is er wanneer ingelezen, en wat is er afgekeurd?
-- ---------------------------------------------------------------------------

create table if not exists dataloket.sync_runs (
  id            bigserial primary key,
  bron          text        not null,
  gestart_op    timestamptz not null default now(),
  geeindigd_op  timestamptz,
  rijen_gelezen integer,
  rijen_geplaatst integer,
  rijen_afgekeurd integer,
  gelukt        boolean     not null default false,
  fout          text
);

comment on table dataloket.sync_runs is
  'Eén regel per sync-run. De laatste geslaagde run bepaalt het "data bijgewerkt om"-stempel in de UI.';

create index if not exists sync_runs_bron_idx
  on dataloket.sync_runs (bron, gestart_op desc);

create table if not exists dataloket.sync_afwijkingen (
  id          bigserial primary key,
  run_id      bigint      not null references dataloket.sync_runs (id) on delete cascade,
  bron        text        not null,
  rijnummer   integer,
  reden       text        not null,
  ruwe_rij    jsonb,
  aangemaakt_op timestamptz not null default now()
);

comment on table dataloket.sync_afwijkingen is
  'Rijen die de validatie niet haalden. Niet weggegooid: hier staat mét reden wat er in de sheet gecorrigeerd moet worden.';

-- ---------------------------------------------------------------------------
-- Querylog: elke vraag en elke uitgevoerde query
-- ---------------------------------------------------------------------------

create table if not exists dataloket.query_log (
  id            bigserial primary key,
  gebruiker_id  uuid        not null,
  vraag         text        not null,
  sql           text        not null,
  toelichting   text,
  gelukt        boolean     not null,
  fout          text,
  aantal_rijen  integer,
  duur_ms       integer,
  aangemaakt_op timestamptz not null default now()
);

comment on table dataloket.query_log is
  'Elke uitgevoerde query. De mislukte regels zijn de backlog voor het datawoordenboek.';

create index if not exists query_log_tijd_idx on dataloket.query_log (aangemaakt_op desc);
create index if not exists query_log_mislukt_idx
  on dataloket.query_log (aangemaakt_op desc) where not gelukt;

alter table dataloket.query_log enable row level security;

-- Ingelogde gebruikers mogen hun eigen regels wegschrijven en teruglezen.
drop policy if exists query_log_insert_eigen on dataloket.query_log;
create policy query_log_insert_eigen on dataloket.query_log
  for insert to authenticated
  with check (gebruiker_id = auth.uid());

drop policy if exists query_log_select_eigen on dataloket.query_log;
create policy query_log_select_eigen on dataloket.query_log
  for select to authenticated
  using (gebruiker_id = auth.uid());

grant usage on schema dataloket to authenticated;
grant insert, select on dataloket.query_log to authenticated;
grant usage, select on sequence dataloket.query_log_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- VOORBEELDDATA — vervangen zodra de echte sheets gekoppeld zijn
-- ---------------------------------------------------------------------------

create table if not exists dataloket.verkopen_raw (
  ordernummer   text primary key,
  tekendatum    date,
  afleverdatum  date,
  merk          text,
  status        text,
  aantal        integer,
  orderbedrag   numeric(12, 2),
  ingelezen_op  timestamptz not null default now()
);

-- De view is de laag waar jij de namen en de filters bepaalt. De chat kijkt uitsluitend
-- hiernaar, nooit naar de tabel eronder — zo houd je kolommen die niemand hoeft te zien
-- (klantnamen, marges) simpelweg buiten bereik.
create or replace view dataloket.v_verkopen as
  select
    ordernummer,
    tekendatum,
    afleverdatum,
    merk,
    status,
    coalesce(aantal, 1) as aantal,
    orderbedrag
  from dataloket.verkopen_raw
  where merk is not null;

comment on view dataloket.v_verkopen is
  'Verkochte voertuigen per orderregel. Beschreven in lib/dictionary/tabellen/verkopen.ts.';

insert into dataloket.verkopen_raw
  (ordernummer, tekendatum, afleverdatum, merk, status, aantal, orderbedrag)
values
  ('2025-0412', '2025-09-30', '2025-11-14', 'DAF',     'afgeleverd',   2, 268400.00),
  ('2025-0413', '2025-10-01', null,         'DAF',     'definitief',   1, 131200.00),
  ('2025-0414', '2025-10-03', null,         'Volvo',   'definitief',   1, 142750.00),
  ('2025-0415', '2025-10-06', null,         'DAF',     'offerte',      3, 394800.00),
  ('2025-0416', '2025-08-12', '2025-10-02', 'Renault', 'afgeleverd',   1,  98300.00),
  ('2025-0417', '2025-09-29', '2025-12-01', 'MAN',     'afgeleverd',   1, 118900.00),
  ('2025-0418', '2025-10-02', null,         'Volvo',   'geannuleerd',  1, 139000.00)
on conflict (ordernummer) do nothing;

-- ---------------------------------------------------------------------------
-- De read-only rol waarop de chat draait
-- ---------------------------------------------------------------------------
--
-- Dit is de belangrijkste grens in het hele systeem. Deze rol kan uitsluitend SELECT op
-- de v_-views: geen ruwe tabellen, geen auth-gegevens, geen schrijfrechten. Zelfs als
-- het model een DELETE zou schrijven, weigert Postgres hem hier.
--
-- Vervang het wachtwoord hieronder en zet de bijbehorende connection string in
-- DATAQUERY_DATABASE_URL (gebruik de pooler-URL van Supabase, poort 6543).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'dataloket_lezer') then
    create role dataloket_lezer login password 'VERVANG_DIT_WACHTWOORD';
  end if;
end
$$;

-- Alleen dit schema; expliciet géén rechten op public.
revoke all on schema public from dataloket_lezer;
grant usage on schema dataloket to dataloket_lezer;

-- Alleen de views, niet de tabellen eronder.
grant select on dataloket.v_verkopen to dataloket_lezer;

-- Zodat `select * from v_verkopen` werkt zonder schemaprefix.
alter role dataloket_lezer set search_path = dataloket;

-- Extra vangnet bovenop de READ ONLY-transactie in de applicatie.
alter role dataloket_lezer set default_transaction_read_only = on;
alter role dataloket_lezer set statement_timeout = '10s';

-- LET OP: elke nieuwe view moet hier expliciet worden vrijgegeven. Dat is bewust geen
-- automatisme — een view die niemand heeft vrijgegeven, bestaat niet voor de chat.
