-- Claude-kosten: welke API-aanroepen zijn gedaan, met tokens en geschatte kosten.
--
-- Dit is geen kopie van de echte Anthropic-factuur (die staat alleen in hún dashboard)
-- — het is een schatting op basis van de gepubliceerde lijstprijs per model, berekend
-- uit de tokenaantallen die elke aanroep zelf teruggeeft. Genoeg om te zien welke dag,
-- welk model en welk onderdeel (chat of nabewerking) de kosten maakt. Zie lib/kosten.ts.

create table if not exists dataloket.claude_gebruik (
  id                   bigserial primary key,
  model                text        not null,
  doel                 text        not null default 'chat'
                         check (doel in ('chat', 'nabewerking')),
  input_tokens         integer     not null default 0,
  output_tokens        integer     not null default 0,
  cache_schrijf_tokens integer     not null default 0,
  cache_lees_tokens    integer     not null default 0,
  -- Anthropic factureert in dollars; omrekenen naar euro's zou een wisselkoers nodig
  -- hebben die dit dashboard niet heeft en wekt de indruk van een exact bedrag.
  kosten_usd           numeric(12, 6) not null default 0,
  gebruiker_id         uuid,
  aangemaakt_op        timestamptz not null default now()
);

comment on table dataloket.claude_gebruik is
  'Eén regel per Claude API-aanroep: model, tokens en geschatte kosten in USD. Voedt het Kosten-tabblad.';

create index if not exists claude_gebruik_tijd_idx
  on dataloket.claude_gebruik (aangemaakt_op desc);
create index if not exists claude_gebruik_model_idx
  on dataloket.claude_gebruik (model);

alter table dataloket.claude_gebruik enable row level security;

-- Gedeeld overzicht, geen persoonlijke data: elke ingelogde collega mag de kosten van
-- de hele chat zien, niet alleen die van zichzelf.
drop policy if exists claude_gebruik_lezen on dataloket.claude_gebruik;
create policy claude_gebruik_lezen on dataloket.claude_gebruik
  for select to authenticated using (true);

-- Wegschrijven gebeurt uitsluitend vanuit de servercode, na afloop van een geslaagde
-- Claude-aanroep — nooit rechtstreeks vanuit de browser.
drop policy if exists claude_gebruik_schrijven on dataloket.claude_gebruik;
create policy claude_gebruik_schrijven on dataloket.claude_gebruik
  for insert to authenticated with check (true);

grant usage on schema dataloket to authenticated;
grant select, insert on dataloket.claude_gebruik to authenticated;
grant usage, select on sequence dataloket.claude_gebruik_id_seq to authenticated;
