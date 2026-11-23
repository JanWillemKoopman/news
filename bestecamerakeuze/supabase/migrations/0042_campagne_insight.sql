-- Campaign insight (tabblad Campagnes → Campaign insight)
--
-- WAAROM DIT BESTAAT
-- Een campagne (bv. "Audi A2") wordt door Claude Code geanalyseerd over de hele online
-- funnel: kosten en bereik op de advertentieplatforms, organische posts, verkeer en gedrag op
-- de campagnepagina('s), e-mailverkeer, lead-events op de website en de leads in Syntec. Het
-- dashboard toont die analyses; Claude Code schrijft ze weg. Een campagne kan vaker worden
-- geanalyseerd: elke analyse is een nieuwe versie, de eerdere blijven op te halen.
--
-- DRIE TABELLEN
--  - insight_campagnes: de briefing die het team in het dashboard invult (naam, looptijd,
--    doel, budget, omschrijving, merk/model en optioneel zoektermen en campagnepagina's).
--    Bewust een eigen tabel en niet de sheet: dit is wat de analyse nodig heeft, niet de
--    campagnelijst van het weekoverleg. `sheet_campagne` mag naar een sheetcampagne wijzen.
--  - insight_prompts: de hoofdprompt, met versies. De nieuwste regel is de geldende prompt;
--    elke analyse onthoudt met welke versie hij is gemaakt.
--  - insight_analyses: één regel per analyse (versie 1, 2, …) met een momentopname van de
--    briefing, de kerncijfers voor het overzicht en het volledige resultaat (jsonb).
--
-- SCHRIJVEN VAN ANALYSES
-- Alleen via de functie insight_bewaar_analyse (Claude Code, via de Supabase-verbinding):
-- die kent het volgende versienummer toe onder een rijslot, zodat twee gelijktijdige runs
-- nooit hetzelfde nummer krijgen, en legt de briefing van dat moment vast. Ingelogde
-- collega's kunnen analyses alleen lezen.

create table if not exists dataloket.insight_campagnes (
  id                     uuid primary key default gen_random_uuid(),
  naam                   text not null check (length(trim(naam)) > 0),
  merk                   text,
  model                  text,
  startdatum             date,
  einddatum              date,
  doel                   text,
  budget                 numeric(12, 2),
  omschrijving           text,
  -- Optioneel, voor de herkenning: woorden waaraan campagnes en posts te herkennen zijn
  -- (één per regel of komma-gescheiden) en bekende campagnepagina's (één per regel).
  zoektermen             text,
  campagnepaginas        text,
  sheet_campagne         text,
  -- "Analyse aangevraagd" in het dashboard; Claude Code pakt deze op en wist het veld
  -- zodra de analyse is bewaard.
  analyse_gevraagd_op    timestamptz,
  analyse_gevraagd_door  uuid,
  -- Leeg als Claude Code de campagne aanmaakt (geen ingelogde gebruiker).
  aangemaakt_door        uuid default auth.uid(),
  aangemaakt_op          timestamptz not null default now(),
  bijgewerkt_op          timestamptz not null default now(),
  check (einddatum is null or startdatum is null or einddatum >= startdatum)
);

comment on table dataloket.insight_campagnes is
  'Campaign insight: de briefing per campagne (naam, looptijd, doel, budget, omschrijving). Ingevuld in het dashboard, gelezen door Claude Code bij een analyse.';

create table if not exists dataloket.insight_prompts (
  id               uuid primary key default gen_random_uuid(),
  versie           integer not null unique,
  inhoud           text not null check (length(trim(inhoud)) > 0),
  opgeslagen_door  uuid default auth.uid(),
  opgeslagen_op    timestamptz not null default now()
);

comment on table dataloket.insight_prompts is
  'Campaign insight: de hoofdprompt voor de analyses, met versies. De hoogste versie geldt.';

create table if not exists dataloket.insight_analyses (
  id               uuid primary key default gen_random_uuid(),
  campagne_id      uuid not null references dataloket.insight_campagnes (id) on delete cascade,
  versie           integer not null,
  geanalyseerd_op  timestamptz not null default now(),
  periode_van      date,
  periode_tot      date,
  -- De briefing zoals hij was op het moment van de analyse.
  briefing         jsonb not null,
  prompt_id        uuid references dataloket.insight_prompts (id) on delete set null,
  model            text,
  samenvatting     text,
  -- Vaste sleutels voor de overzichtstabel (kosten, vertoningen, klikken, sessies, …).
  kerncijfers      jsonb not null default '{}'::jsonb,
  -- Het volledige resultaat: funnel, secties, inzichten, aanbevelingen, herkenning.
  resultaat        jsonb not null,
  unique (campagne_id, versie)
);

create index if not exists insight_analyses_campagne_idx
  on dataloket.insight_analyses (campagne_id, versie desc);

comment on table dataloket.insight_analyses is
  'Campaign insight: één regel per analyse (versie) van een campagne, geschreven door Claude Code via insight_bewaar_analyse.';

-- ---------------------------------------------------------------------------
-- Rijbeveiliging: gedeeld, niet per gebruiker.
-- ---------------------------------------------------------------------------

alter table dataloket.insight_campagnes enable row level security;
alter table dataloket.insight_prompts enable row level security;
alter table dataloket.insight_analyses enable row level security;

drop policy if exists insight_campagnes_lezen on dataloket.insight_campagnes;
create policy insight_campagnes_lezen on dataloket.insight_campagnes
  for select to authenticated using (true);

drop policy if exists insight_campagnes_toevoegen on dataloket.insight_campagnes;
create policy insight_campagnes_toevoegen on dataloket.insight_campagnes
  for insert to authenticated with check (aangemaakt_door = auth.uid());

drop policy if exists insight_campagnes_bijwerken on dataloket.insight_campagnes;
create policy insight_campagnes_bijwerken on dataloket.insight_campagnes
  for update to authenticated using (true) with check (true);

-- Verwijderen controleert de route op beheerder (app/api/campagne-insight).
drop policy if exists insight_campagnes_verwijderen on dataloket.insight_campagnes;
create policy insight_campagnes_verwijderen on dataloket.insight_campagnes
  for delete to authenticated using (true);

drop policy if exists insight_prompts_lezen on dataloket.insight_prompts;
create policy insight_prompts_lezen on dataloket.insight_prompts
  for select to authenticated using (true);

-- Opslaan controleert de route op beheerder; hier alleen dat de regel op eigen naam staat.
drop policy if exists insight_prompts_toevoegen on dataloket.insight_prompts;
create policy insight_prompts_toevoegen on dataloket.insight_prompts
  for insert to authenticated with check (opgeslagen_door = auth.uid());

drop policy if exists insight_analyses_lezen on dataloket.insight_analyses;
create policy insight_analyses_lezen on dataloket.insight_analyses
  for select to authenticated using (true);

grant select, insert, update, delete on dataloket.insight_campagnes to authenticated;
grant select, insert on dataloket.insight_prompts to authenticated;
grant select on dataloket.insight_analyses to authenticated;
grant all on dataloket.insight_campagnes, dataloket.insight_prompts, dataloket.insight_analyses to service_role;

-- ---------------------------------------------------------------------------
-- Een analyse bewaren: volgende versie, momentopname van de briefing, aanvraag wissen.
-- ---------------------------------------------------------------------------

create or replace function dataloket.insight_bewaar_analyse(
  p_campagne_id  uuid,
  p_resultaat    jsonb,
  p_kerncijfers  jsonb,
  p_samenvatting text,
  p_periode_van  date,
  p_periode_tot  date,
  p_prompt_id    uuid default null,
  p_model        text default null
) returns table (analyse_id uuid, versie integer)
language plpgsql
set search_path = dataloket, public
as $$
declare
  v_campagne dataloket.insight_campagnes%rowtype;
  v_versie   integer;
  v_id       uuid;
begin
  -- Rijslot op de campagne: twee gelijktijdige runs krijgen zo nooit hetzelfde nummer.
  select * into v_campagne from dataloket.insight_campagnes where id = p_campagne_id for update;
  if not found then
    raise exception 'Campagne % bestaat niet', p_campagne_id;
  end if;

  select coalesce(max(a.versie), 0) + 1 into v_versie
  from dataloket.insight_analyses a where a.campagne_id = p_campagne_id;

  insert into dataloket.insight_analyses
    (campagne_id, versie, periode_van, periode_tot, briefing, prompt_id, model, samenvatting, kerncijfers, resultaat)
  values (
    p_campagne_id, v_versie, p_periode_van, p_periode_tot,
    jsonb_build_object(
      'naam', v_campagne.naam,
      'merk', v_campagne.merk,
      'model', v_campagne.model,
      'startdatum', v_campagne.startdatum,
      'einddatum', v_campagne.einddatum,
      'doel', v_campagne.doel,
      'budget', v_campagne.budget,
      'omschrijving', v_campagne.omschrijving,
      'zoektermen', v_campagne.zoektermen,
      'campagnepaginas', v_campagne.campagnepaginas
    ),
    p_prompt_id, p_model, p_samenvatting, coalesce(p_kerncijfers, '{}'::jsonb), p_resultaat
  )
  returning id into v_id;

  update dataloket.insight_campagnes
     set analyse_gevraagd_op = null, analyse_gevraagd_door = null
   where id = p_campagne_id;

  return query select v_id, v_versie;
end;
$$;

comment on function dataloket.insight_bewaar_analyse is
  'Bewaart een Campaign insight-analyse als volgende versie van de campagne. Alleen voor Claude Code (service role / postgres), niet voor ingelogde collega''s.';

revoke all on function dataloket.insight_bewaar_analyse(uuid, jsonb, jsonb, text, date, date, uuid, text) from public;
grant execute on function dataloket.insight_bewaar_analyse(uuid, jsonb, jsonb, text, date, date, uuid, text) to service_role;
