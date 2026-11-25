-- Marketing analyse: voorgestelde campagne analyses
--
-- WAAROM DIT BESTAAT
-- Claude Code zoekt met de skill campagne-voorstellen in Windsor welke actiecampagnes van onze
-- bedrijven nu live zijn en vult per campagne alvast een briefing in. Het overzicht van Marketing
-- analyse toont ze bovenaan in de balk "Voorgestelde campagne analyses". Een gebruiker loopt de
-- briefing na en voegt hem toe; dan wordt het een gewone campagne met de Analyse ronde aan.
-- Plan en besluiten: bestecamerakeuze/campagne-voorstellen-plan.md.
--
-- WAT ER VERANDERT
--  - marketing_analyse_voorstellen: één regel per voorstel (per campagnepagina per bedrijf, of
--    zonder eigen pagina per onderwerp per bedrijf), met status open / toegevoegd / genegeerd /
--    verlopen. De sleutel zorgt dat een volgende zoekronde hetzelfde voorstel bijwerkt.
--  - marketing_analyse_zoekrondes: wanneer er gezocht is en wat het opleverde.
--  - marketing_analyse_campagnes: campagnepaginas (ook in de briefing), voorstel_id en
--    herkenning (het bewijs uit het voorstel, startpunt voor de eerste analyse).
--  - marketing_analyse_pagina_sleutel: één vorm van een URL om op te vergelijken.
--  - marketing_analyse_voorstellen_bewaar (Claude Code): een zoekronde in één keer wegschrijven.
--  - marketing_analyse_voorstel_toevoegen (dashboard): de nagelopen briefing als campagne
--    aanmaken en het voorstel afsluiten, in één transactie.

-- ---------------------------------------------------------------------------
-- Eén vorm van een URL: host zonder www, pad, kleine letters, zonder query, hash of slash aan
-- het eind. "https://www.Udenhout.nl/acties/a2-e-tron/?utm_source=x" → "udenhout.nl/acties/a2-e-tron".
-- Dezelfde regel staat in lib/marketingAnalyse/rekenen.ts (paginaSleutel), getest.
-- ---------------------------------------------------------------------------
create or replace function dataloket.marketing_analyse_pagina_sleutel(p_url text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(trim(coalesce(p_url, ''))), '^[a-z]+://', ''),
        '[?#].*$', ''),
      '^www\.|/+$', '', 'g'),
    '')
$$;

-- ---------------------------------------------------------------------------
-- Campagnes: campagnepagina's, herkomst en herkenning
-- ---------------------------------------------------------------------------
alter table dataloket.marketing_analyse_campagnes
  add column if not exists campagnepaginas text[] not null default '{}',
  add column if not exists herkenning jsonb;

comment on column dataloket.marketing_analyse_campagnes.campagnepaginas is
  'De campagnepagina(''s) van de campagne (volledige URL''s). Ingevuld in de briefing of uit een voorstel; de zoekronde herkent er bestaande campagnes aan.';
comment on column dataloket.marketing_analyse_campagnes.herkenning is
  'Het bewijs uit het voorstel waaruit de campagne is gemaakt (platformcampagnes, uitgaven, social posts). Startpunt voor de herkenning in de eerste analyse; de analyse controleert het zelf.';

-- ---------------------------------------------------------------------------
-- Voorstellen
-- ---------------------------------------------------------------------------
create table if not exists dataloket.marketing_analyse_voorstellen (
  id                 uuid primary key default gen_random_uuid(),
  -- Bedrijf + paginasleutel, of zonder pagina bedrijf + "onderwerp:" + korte naam.
  sleutel            text not null unique,
  status             text not null default 'open'
                       check (status in ('open', 'toegevoegd', 'genegeerd', 'verlopen')),
  -- De voorgestelde briefing (zelfde velden als marketing_analyse_campagnes).
  naam               text not null check (length(trim(naam)) > 0),
  bedrijven          text[] not null default '{}',
  merk               text,
  modellen           text[] not null default '{}',
  startdatum         date,
  einddatum          date,
  budget             numeric(12, 2),
  doel               text,
  omschrijving       text,
  campagnepaginas    text[] not null default '{}',
  -- Hoe zeker de skill is: zeker / waarschijnlijk / twijfel, met de reden bij twijfel.
  zekerheid          text not null default 'waarschijnlijk'
                       check (zekerheid in ('zeker', 'waarschijnlijk', 'twijfel')),
  reden              text,
  -- Voor de balk: welke kanalen meedoen, wat er tot nu toe is uitgegeven en wanneer het laatst.
  kanalen            text[] not null default '{}',
  uitgaven_tot_nu    numeric(12, 2),
  laatste_uitgave_op date,
  -- Platformcampagnes, uitgaven per platform, GA4-sessies, social posts, kanttekeningen.
  bewijs             jsonb not null default '{}'::jsonb,
  gevonden_op        timestamptz not null default now(),
  laatst_gezien_op   timestamptz not null default now(),
  bijgewerkt_op      timestamptz not null default now(),
  campagne_id        uuid references dataloket.marketing_analyse_campagnes (id) on delete set null,
  afgehandeld_door   uuid,
  afgehandeld_op     timestamptz,
  check (einddatum is null or startdatum is null or einddatum >= startdatum)
);

create index if not exists marketing_analyse_voorstellen_status_idx
  on dataloket.marketing_analyse_voorstellen (status, laatst_gezien_op desc);

comment on table dataloket.marketing_analyse_voorstellen is
  'Marketing analyse: voorgestelde campagne analyses, gevonden door Claude Code (skill campagne-voorstellen). Toevoegen en negeren in het dashboard.';

alter table dataloket.marketing_analyse_campagnes
  add column if not exists voorstel_id uuid references dataloket.marketing_analyse_voorstellen (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Zoekrondes
-- ---------------------------------------------------------------------------
create table if not exists dataloket.marketing_analyse_zoekrondes (
  id                  uuid primary key default gen_random_uuid(),
  gezocht_op          timestamptz not null default now(),
  bedrijven           text[] not null default '{}',
  aantal_nieuw        integer not null default 0,
  aantal_bijgewerkt   integer not null default 0,
  aantal_overgeslagen integer not null default 0,
  aantal_verlopen     integer not null default 0,
  terugmelding        text,
  model               text
);

comment on table dataloket.marketing_analyse_zoekrondes is
  'Marketing analyse: elke zoekronde van de skill campagne-voorstellen, met wat hij opleverde.';

-- ---------------------------------------------------------------------------
-- Rijbeveiliging: gedeeld. Iedereen die ingelogd is mag voorstellen lezen, toevoegen, negeren
-- en terugzetten (besluit van de eigenaar). Nieuwe voorstellen komen alleen via de functie.
-- ---------------------------------------------------------------------------
alter table dataloket.marketing_analyse_voorstellen enable row level security;
alter table dataloket.marketing_analyse_zoekrondes enable row level security;

drop policy if exists ma_voorstellen_lezen on dataloket.marketing_analyse_voorstellen;
create policy ma_voorstellen_lezen on dataloket.marketing_analyse_voorstellen
  for select to authenticated using (true);
drop policy if exists ma_voorstellen_bijwerken on dataloket.marketing_analyse_voorstellen;
create policy ma_voorstellen_bijwerken on dataloket.marketing_analyse_voorstellen
  for update to authenticated using (true) with check (true);

drop policy if exists ma_zoekrondes_lezen on dataloket.marketing_analyse_zoekrondes;
create policy ma_zoekrondes_lezen on dataloket.marketing_analyse_zoekrondes
  for select to authenticated using (true);

grant select, update on dataloket.marketing_analyse_voorstellen to authenticated;
grant select on dataloket.marketing_analyse_zoekrondes to authenticated;
grant all on dataloket.marketing_analyse_voorstellen, dataloket.marketing_analyse_zoekrondes to service_role;

-- ---------------------------------------------------------------------------
-- Een zoekronde wegschrijven (Claude Code)
--
-- p_voorstellen: een lijst objecten met naam, bedrijven (precies één bedrijf), merk, modellen,
-- startdatum, einddatum, budget, doel, omschrijving, campagnepaginas, onderwerp (korte naam,
-- verplicht zonder pagina), zekerheid, reden, kanalen, uitgaven_tot_nu, laatste_uitgave_op, bewijs.
-- p_bedrijven: de bedrijven waarin deze ronde heeft gezocht. Een open voorstel van die bedrijven
-- dat niet meer gevonden is, wordt verlopen.
--
-- Per voorstel:
--  - staat er al een campagne van dat bedrijf met dezelfde campagnepagina: overgeslagen;
--  - nieuw: aangemaakt;
--  - bestaand en open of verlopen: bijgewerkt en weer open;
--  - bestaand en toegevoegd of genegeerd: alleen laatst_gezien_op (een genegeerd voorstel komt
--    dus niet terug).
-- ---------------------------------------------------------------------------
create or replace function dataloket.marketing_analyse_voorstellen_bewaar(
  p_voorstellen  jsonb,
  p_bedrijven    text[],
  p_terugmelding text default null,
  p_model        text default null
)
returns jsonb
language plpgsql
set search_path = dataloket, public
as $$
declare
  v            jsonb;
  v_bedrijf    text;
  v_paginas    text[];
  v_sleutel    text;
  v_bestaand   dataloket.marketing_analyse_voorstellen%rowtype;
  v_campagne   text;
  v_gezien     text[] := '{}';
  v_nieuw      integer := 0;
  v_bijgewerkt integer := 0;
  v_over       integer := 0;
  v_verlopen   integer := 0;
  v_al         jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(coalesce(p_voorstellen, '[]'::jsonb)) <> 'array' then
    raise exception 'p_voorstellen moet een lijst zijn';
  end if;

  for v in select * from jsonb_array_elements(coalesce(p_voorstellen, '[]'::jsonb)) loop
    if jsonb_typeof(v->'bedrijven') <> 'array' or jsonb_array_length(v->'bedrijven') <> 1 then
      raise exception 'Voorstel "%": geef precies één bedrijf op (één voorstel per bedrijf)', v->>'naam';
    end if;
    v_bedrijf := trim(v->'bedrijven'->>0);
    v_paginas := coalesce(array(select jsonb_array_elements_text(coalesce(v->'campagnepaginas', '[]'::jsonb))), '{}');

    if cardinality(v_paginas) > 0 then
      v_sleutel := lower(v_bedrijf) || '|' || dataloket.marketing_analyse_pagina_sleutel(v_paginas[1]);
    elsif nullif(trim(v->>'onderwerp'), '') is not null then
      v_sleutel := lower(v_bedrijf) || '|onderwerp:' || lower(trim(v->>'onderwerp'));
    else
      raise exception 'Voorstel "%": zonder campagnepagina is onderwerp verplicht', v->>'naam';
    end if;
    v_gezien := v_gezien || v_sleutel;

    -- Bestaat er al een campagne van dit bedrijf met (een van) deze pagina's?
    v_campagne := null;
    select c.naam into v_campagne
      from dataloket.marketing_analyse_campagnes c
     where v_bedrijf = any (c.bedrijven)
       and exists (
             select 1
               from unnest(c.campagnepaginas) cp, unnest(v_paginas) vp
              where dataloket.marketing_analyse_pagina_sleutel(cp) = dataloket.marketing_analyse_pagina_sleutel(vp))
     limit 1;
    if v_campagne is not null then
      v_over := v_over + 1;
      v_al := v_al || jsonb_build_object('voorstel', v->>'naam', 'campagne', v_campagne);
      continue;
    end if;

    select * into v_bestaand from dataloket.marketing_analyse_voorstellen where sleutel = v_sleutel for update;

    if not found then
      insert into dataloket.marketing_analyse_voorstellen (
        sleutel, naam, bedrijven, merk, modellen, startdatum, einddatum, budget, doel, omschrijving,
        campagnepaginas, zekerheid, reden, kanalen, uitgaven_tot_nu, laatste_uitgave_op, bewijs)
      values (
        v_sleutel, v->>'naam', array[v_bedrijf], nullif(v->>'merk', ''),
        coalesce(array(select jsonb_array_elements_text(coalesce(v->'modellen', '[]'::jsonb))), '{}'),
        nullif(v->>'startdatum', '')::date, nullif(v->>'einddatum', '')::date, nullif(v->>'budget', '')::numeric,
        nullif(v->>'doel', ''), nullif(v->>'omschrijving', ''), v_paginas,
        coalesce(nullif(v->>'zekerheid', ''), 'waarschijnlijk'), nullif(v->>'reden', ''),
        coalesce(array(select jsonb_array_elements_text(coalesce(v->'kanalen', '[]'::jsonb))), '{}'),
        nullif(v->>'uitgaven_tot_nu', '')::numeric, nullif(v->>'laatste_uitgave_op', '')::date,
        coalesce(v->'bewijs', '{}'::jsonb));
      v_nieuw := v_nieuw + 1;
    elsif v_bestaand.status in ('open', 'verlopen') then
      update dataloket.marketing_analyse_voorstellen set
        status = 'open', naam = v->>'naam', merk = nullif(v->>'merk', ''),
        modellen = coalesce(array(select jsonb_array_elements_text(coalesce(v->'modellen', '[]'::jsonb))), '{}'),
        startdatum = nullif(v->>'startdatum', '')::date, einddatum = nullif(v->>'einddatum', '')::date,
        budget = nullif(v->>'budget', '')::numeric, doel = nullif(v->>'doel', ''),
        omschrijving = nullif(v->>'omschrijving', ''), campagnepaginas = v_paginas,
        zekerheid = coalesce(nullif(v->>'zekerheid', ''), 'waarschijnlijk'), reden = nullif(v->>'reden', ''),
        kanalen = coalesce(array(select jsonb_array_elements_text(coalesce(v->'kanalen', '[]'::jsonb))), '{}'),
        uitgaven_tot_nu = nullif(v->>'uitgaven_tot_nu', '')::numeric,
        laatste_uitgave_op = nullif(v->>'laatste_uitgave_op', '')::date,
        bewijs = coalesce(v->'bewijs', '{}'::jsonb),
        laatst_gezien_op = now(), bijgewerkt_op = now()
      where id = v_bestaand.id;
      v_bijgewerkt := v_bijgewerkt + 1;
    else
      update dataloket.marketing_analyse_voorstellen set laatst_gezien_op = now() where id = v_bestaand.id;
    end if;
  end loop;

  -- Wat in deze bedrijven open stond en nu niet meer gevonden is, is niet meer live.
  update dataloket.marketing_analyse_voorstellen
     set status = 'verlopen', bijgewerkt_op = now()
   where status = 'open'
     and bedrijven && coalesce(p_bedrijven, '{}')
     and not (sleutel = any (v_gezien));
  get diagnostics v_verlopen = row_count;

  insert into dataloket.marketing_analyse_zoekrondes
    (bedrijven, aantal_nieuw, aantal_bijgewerkt, aantal_overgeslagen, aantal_verlopen, terugmelding, model)
  values (coalesce(p_bedrijven, '{}'), v_nieuw, v_bijgewerkt, v_over, v_verlopen, p_terugmelding, p_model);

  return jsonb_build_object(
    'nieuw', v_nieuw, 'bijgewerkt', v_bijgewerkt, 'overgeslagen', v_over,
    'verlopen', v_verlopen, 'al_een_campagne', v_al);
end;
$$;

revoke all on function dataloket.marketing_analyse_voorstellen_bewaar(jsonb, text[], text, text) from public;
grant execute on function dataloket.marketing_analyse_voorstellen_bewaar(jsonb, text[], text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Een voorstel toevoegen (dashboard): de nagelopen briefing wordt een campagne met opzet
-- Campagne analyse en de Analyse ronde aan; het voorstel gaat op toegevoegd. Rijbeveiliging
-- geldt (security invoker): wie ingelogd is mag campagnes aanmaken en voorstellen bijwerken.
-- ---------------------------------------------------------------------------
create or replace function dataloket.marketing_analyse_voorstel_toevoegen(
  p_voorstel_id     uuid,
  p_naam            text,
  p_bedrijven       text[],
  p_merk            text,
  p_modellen        text[],
  p_startdatum      date,
  p_einddatum       date,
  p_doel            text,
  p_budget          numeric,
  p_omschrijving    text,
  p_data_correctie  text,
  p_campagnepaginas text[]
)
returns uuid
language plpgsql
set search_path = dataloket, public
as $$
declare
  v_voorstel dataloket.marketing_analyse_voorstellen%rowtype;
  v_id       uuid;
begin
  select * into v_voorstel from dataloket.marketing_analyse_voorstellen where id = p_voorstel_id for update;
  if not found then
    raise exception 'Voorstel niet gevonden.' using errcode = 'P0002';
  end if;
  if v_voorstel.status <> 'open' then
    raise exception 'Dit voorstel is al afgehandeld.' using errcode = 'P0001';
  end if;

  insert into dataloket.marketing_analyse_campagnes (
    opzet_id, naam, bedrijven, merk, modellen, startdatum, einddatum, doel, budget, omschrijving,
    data_correctie, data_correctie_bijgewerkt_op, campagnepaginas, analyse_ronde, voorstel_id,
    herkenning, aangemaakt_door)
  values (
    '7d0c0000-0000-4000-8000-000000000001', p_naam, coalesce(p_bedrijven, '{}'), p_merk,
    coalesce(p_modellen, '{}'), p_startdatum, p_einddatum, p_doel, p_budget, p_omschrijving,
    p_data_correctie, case when p_data_correctie is not null then now() end,
    coalesce(p_campagnepaginas, '{}'), true, v_voorstel.id, v_voorstel.bewijs, auth.uid())
  returning id into v_id;

  update dataloket.marketing_analyse_voorstellen
     set status = 'toegevoegd', campagne_id = v_id, afgehandeld_door = auth.uid(),
         afgehandeld_op = now(), bijgewerkt_op = now()
   where id = v_voorstel.id;

  return v_id;
end;
$$;

revoke all on function dataloket.marketing_analyse_voorstel_toevoegen(uuid, text, text[], text, text[], date, date, text, numeric, text, text, text[]) from public;
grant execute on function dataloket.marketing_analyse_voorstel_toevoegen(uuid, text, text[], text, text[], date, date, text, numeric, text, text, text[]) to authenticated, service_role;
