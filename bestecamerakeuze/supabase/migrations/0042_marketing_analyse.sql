-- Marketing analyse (tabblad Campagnes → Marketing analyse)
--
-- WAAROM DIT BESTAAT
-- Per campagne maakt Claude Code een full-funnel analyse; het dashboard toont hem. Een
-- campagne kan vaker worden geanalyseerd: elke analyse is een nieuwe versie, eerdere blijven
-- op te halen. Zie bestecamerakeuze/campagne-analyse-tool.md voor het plan en de besluiten.
--
-- TABELLEN
--  - marketing_analyse_campagnes: de briefing (naam, bedrijf, merk, modellen, looptijd, doel,
--    budget, omschrijving), de Data correctie en de schakelaar Analyse ronde.
--  - marketing_analyse_prompts: de hoofdprompt, met versies (de hoogste geldt).
--  - marketing_analyse_semantiek: de semantic layer (kennis per databron), met versies.
--  - marketing_analyse_versies: één regel per analyse (v1, v2, …) met het label (tussentijdse
--    evaluatie of eindevaluatie), een momentopname van de briefing, de kerncijfers en het
--    resultaat.
--  - marketing_analyse_leads: de smalle nachtelijke kopie van het sheet-tabblad "Data leads"
--    (zes kolommen 1-op-1, laatste 365 dagen, zonder "FW:"), gevuld door /api/sync. De
--    analyse gebruikt voor leads alleen deze tabel, niet leads_raw of v_leads.
--
-- SCHRIJVEN VAN ANALYSES
-- Alleen via marketing_analyse_bewaar (Claude Code): kent het volgende versienummer toe uit
-- een teller op de campagne (een verwijderde versie wordt nooit hergebruikt), bepaalt het
-- label, legt de briefing en de Data correctie van dat moment vast en zet de Analyse ronde
-- uit na een eindevaluatie.

-- ---------------------------------------------------------------------------
-- Campagnes (briefing)
-- ---------------------------------------------------------------------------
create table if not exists dataloket.marketing_analyse_campagnes (
  id                          uuid primary key default gen_random_uuid(),
  naam                        text not null check (length(trim(naam)) > 0),
  -- Voor welk van onze bedrijven (Van den Udenhout, Porsche Centrum Brabant, …). Bepaalt in
  -- welke accounts en properties de analyse kijkt (semantic layer, blok Algemeen).
  bedrijf                     text not null check (length(trim(bedrijf)) > 0),
  -- Het automerk en de modellen (optioneel).
  merk                        text,
  modellen                    text[] not null default '{}',
  startdatum                  date,
  einddatum                   date,
  doel                        text,
  budget                      numeric(12, 2),
  omschrijving                text,
  -- Wat er bij een vorige analyse niet klopte; de volgende analyse past het toe.
  data_correctie              text,
  data_correctie_bijgewerkt_op timestamptz,
  -- Aan: "voer de analyseronde uit" neemt deze campagne mee. Gaat uit na een eindevaluatie.
  analyse_ronde               boolean not null default false,
  -- Teller voor het versienummer, zodat een verwijderde versie nooit wordt hergebruikt.
  laatste_versie              integer not null default 0,
  -- Leeg als Claude Code de campagne aanmaakt (geen ingelogde gebruiker).
  aangemaakt_door             uuid default auth.uid(),
  aangemaakt_op               timestamptz not null default now(),
  bijgewerkt_op               timestamptz not null default now(),
  check (einddatum is null or startdatum is null or einddatum >= startdatum)
);

comment on table dataloket.marketing_analyse_campagnes is
  'Marketing analyse: de briefing per campagne, de Data correctie en de schakelaar Analyse ronde. Ingevuld in het dashboard, gelezen door Claude Code.';

-- ---------------------------------------------------------------------------
-- Hoofdprompt en semantic layer (met versies)
-- ---------------------------------------------------------------------------
create table if not exists dataloket.marketing_analyse_prompts (
  id               uuid primary key default gen_random_uuid(),
  versie           integer not null unique,
  inhoud           text not null check (length(trim(inhoud)) > 0),
  opgeslagen_door  uuid default auth.uid(),
  opgeslagen_op    timestamptz not null default now()
);

comment on table dataloket.marketing_analyse_prompts is
  'Marketing analyse: de hoofdprompt, met versies. De hoogste versie geldt.';

create table if not exists dataloket.marketing_analyse_semantiek (
  id               uuid primary key default gen_random_uuid(),
  versie           integer not null unique,
  -- { "bedrijven": ["Van den Udenhout", …], "blokken": { "algemeen": "…", "ga4": "…", … } }
  inhoud           jsonb not null,
  opgeslagen_door  uuid default auth.uid(),
  opgeslagen_op    timestamptz not null default now()
);

comment on table dataloket.marketing_analyse_semantiek is
  'Marketing analyse: de semantic layer (kennis per databron), met versies. De hoogste versie geldt.';

-- ---------------------------------------------------------------------------
-- Analyses (versies)
-- ---------------------------------------------------------------------------
create table if not exists dataloket.marketing_analyse_versies (
  id               uuid primary key default gen_random_uuid(),
  campagne_id      uuid not null references dataloket.marketing_analyse_campagnes (id) on delete cascade,
  versie           integer not null,
  label            text not null check (label in ('tussentijds', 'eind')),
  geanalyseerd_op  timestamptz not null default now(),
  periode_van      date,
  periode_tot      date,
  -- De briefing en de Data correctie zoals ze waren op het moment van de analyse.
  briefing         jsonb not null,
  prompt_id        uuid references dataloket.marketing_analyse_prompts (id) on delete set null,
  semantiek_id     uuid references dataloket.marketing_analyse_semantiek (id) on delete set null,
  model            text,
  samenvatting     text,
  kerncijfers      jsonb not null default '{}'::jsonb,
  resultaat        jsonb not null,
  unique (campagne_id, versie)
);

create index if not exists marketing_analyse_versies_campagne_idx
  on dataloket.marketing_analyse_versies (campagne_id, versie desc);

comment on table dataloket.marketing_analyse_versies is
  'Marketing analyse: één regel per analyse (versie) van een campagne, geschreven door Claude Code via marketing_analyse_bewaar.';

-- ---------------------------------------------------------------------------
-- Leads-kopie voor de analyse
-- ---------------------------------------------------------------------------
create table if not exists dataloket.marketing_analyse_leads (
  ordersoort    text,
  onderwerp     text,
  kanaalgroep   text,
  merk          text,
  model         text,
  -- 1-op-1 zoals in de sheet ("23-11-2026 7:40") …
  aangelegd     text,
  -- … en daarnaast als tijdstip, om op periode te kunnen filteren.
  aangelegd_op  timestamptz
);

create index if not exists marketing_analyse_leads_tijd_idx
  on dataloket.marketing_analyse_leads (aangelegd_op);

comment on table dataloket.marketing_analyse_leads is
  'Marketing analyse: nachtelijke kopie van het sheet-tabblad "Data leads" met zes kolommen 1-op-1 (Ordersoort, Onderwerp, Kanaalgroep, Merk, Model, Aangelegd), de laatste 365 dagen, zonder rijen met "FW:" in Onderwerp. Alleen van toepassing op Van den Udenhout.';

-- ---------------------------------------------------------------------------
-- Rijbeveiliging: gedeeld, niet per gebruiker. De eigenaarscontroles (hoofdprompt,
-- semantic layer, verwijderen) zitten in de routes, net als elders in het dashboard.
-- ---------------------------------------------------------------------------
alter table dataloket.marketing_analyse_campagnes enable row level security;
alter table dataloket.marketing_analyse_prompts enable row level security;
alter table dataloket.marketing_analyse_semantiek enable row level security;
alter table dataloket.marketing_analyse_versies enable row level security;
alter table dataloket.marketing_analyse_leads enable row level security;

drop policy if exists ma_campagnes_lezen on dataloket.marketing_analyse_campagnes;
create policy ma_campagnes_lezen on dataloket.marketing_analyse_campagnes
  for select to authenticated using (true);
drop policy if exists ma_campagnes_toevoegen on dataloket.marketing_analyse_campagnes;
create policy ma_campagnes_toevoegen on dataloket.marketing_analyse_campagnes
  for insert to authenticated with check (aangemaakt_door = auth.uid());
drop policy if exists ma_campagnes_bijwerken on dataloket.marketing_analyse_campagnes;
create policy ma_campagnes_bijwerken on dataloket.marketing_analyse_campagnes
  for update to authenticated using (true) with check (true);
drop policy if exists ma_campagnes_verwijderen on dataloket.marketing_analyse_campagnes;
create policy ma_campagnes_verwijderen on dataloket.marketing_analyse_campagnes
  for delete to authenticated using (true);

drop policy if exists ma_prompts_lezen on dataloket.marketing_analyse_prompts;
create policy ma_prompts_lezen on dataloket.marketing_analyse_prompts
  for select to authenticated using (true);
drop policy if exists ma_prompts_toevoegen on dataloket.marketing_analyse_prompts;
create policy ma_prompts_toevoegen on dataloket.marketing_analyse_prompts
  for insert to authenticated with check (opgeslagen_door = auth.uid());

drop policy if exists ma_semantiek_lezen on dataloket.marketing_analyse_semantiek;
create policy ma_semantiek_lezen on dataloket.marketing_analyse_semantiek
  for select to authenticated using (true);
drop policy if exists ma_semantiek_toevoegen on dataloket.marketing_analyse_semantiek;
create policy ma_semantiek_toevoegen on dataloket.marketing_analyse_semantiek
  for insert to authenticated with check (opgeslagen_door = auth.uid());

drop policy if exists ma_versies_lezen on dataloket.marketing_analyse_versies;
create policy ma_versies_lezen on dataloket.marketing_analyse_versies
  for select to authenticated using (true);
drop policy if exists ma_versies_verwijderen on dataloket.marketing_analyse_versies;
create policy ma_versies_verwijderen on dataloket.marketing_analyse_versies
  for delete to authenticated using (true);

drop policy if exists ma_leads_lezen on dataloket.marketing_analyse_leads;
create policy ma_leads_lezen on dataloket.marketing_analyse_leads
  for select to authenticated using (true);

grant select, insert, update, delete on dataloket.marketing_analyse_campagnes to authenticated;
grant select, insert on dataloket.marketing_analyse_prompts to authenticated;
grant select, insert on dataloket.marketing_analyse_semantiek to authenticated;
grant select, delete on dataloket.marketing_analyse_versies to authenticated;
grant select on dataloket.marketing_analyse_leads to authenticated;
grant all on dataloket.marketing_analyse_campagnes, dataloket.marketing_analyse_prompts,
  dataloket.marketing_analyse_semantiek, dataloket.marketing_analyse_versies,
  dataloket.marketing_analyse_leads to service_role;

-- ---------------------------------------------------------------------------
-- Een analyse bewaren
-- ---------------------------------------------------------------------------
create or replace function dataloket.marketing_analyse_bewaar(
  p_campagne_id   uuid,
  p_resultaat     jsonb,
  p_kerncijfers   jsonb,
  p_samenvatting  text,
  p_periode_van   date,
  p_periode_tot   date,
  p_prompt_id     uuid default null,
  p_semantiek_id  uuid default null,
  p_model         text default null
) returns table (analyse_id uuid, versie integer, label text)
language plpgsql
set search_path = dataloket, public
as $$
declare
  v_c      dataloket.marketing_analyse_campagnes%rowtype;
  v_versie integer;
  v_label  text;
  v_id     uuid;
  v_vandaag date := (now() at time zone 'Europe/Amsterdam')::date;
begin
  -- Rijslot: twee gelijktijdige runs krijgen nooit hetzelfde nummer.
  select * into v_c from dataloket.marketing_analyse_campagnes where id = p_campagne_id for update;
  if not found then
    raise exception 'Campagne % bestaat niet', p_campagne_id;
  end if;

  v_versie := v_c.laatste_versie + 1;
  -- Eindevaluatie zodra de einddatum voorbij is; is hij vandaag of later (of leeg), dan
  -- loopt de campagne nog: tussentijdse evaluatie.
  v_label := case when v_c.einddatum is not null and v_c.einddatum < v_vandaag then 'eind' else 'tussentijds' end;

  insert into dataloket.marketing_analyse_versies
    (campagne_id, versie, label, periode_van, periode_tot, briefing, prompt_id, semantiek_id,
     model, samenvatting, kerncijfers, resultaat)
  values (
    p_campagne_id, v_versie, v_label, p_periode_van, p_periode_tot,
    jsonb_build_object(
      'naam', v_c.naam,
      'bedrijf', v_c.bedrijf,
      'merk', v_c.merk,
      'modellen', to_jsonb(v_c.modellen),
      'startdatum', v_c.startdatum,
      'einddatum', v_c.einddatum,
      'doel', v_c.doel,
      'budget', v_c.budget,
      'omschrijving', v_c.omschrijving,
      'dataCorrectie', v_c.data_correctie
    ),
    p_prompt_id, p_semantiek_id, p_model, p_samenvatting,
    coalesce(p_kerncijfers, '{}'::jsonb), p_resultaat
  )
  returning id into v_id;

  update dataloket.marketing_analyse_campagnes
     set laatste_versie = v_versie,
         analyse_ronde = case when v_label = 'eind' then false else analyse_ronde end
   where id = p_campagne_id;

  return query select v_id, v_versie, v_label;
end;
$$;

comment on function dataloket.marketing_analyse_bewaar is
  'Bewaart een Marketing analyse als volgende versie van de campagne, met label tussentijds/eind. Alleen voor Claude Code (service role / postgres).';

revoke all on function dataloket.marketing_analyse_bewaar(uuid, jsonb, jsonb, text, date, date, uuid, uuid, text) from public;
grant execute on function dataloket.marketing_analyse_bewaar(uuid, jsonb, jsonb, text, date, date, uuid, uuid, text) to service_role;
