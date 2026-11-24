-- Marketing analyse, fase 2: analyse opzetten
--
-- WAAROM DIT BESTAAT
-- Naast de campagne-analyse komen er andere soorten analyses (de "analyse opzet"), zoals de
-- VDU- en PGZ-maand- en kwartaalrapportages. Elke opzet heeft een eigen prompt; de semantic
-- layer blijft één en dezelfde. De eigenaar kan in het dashboard zelf opzetten toevoegen.
-- Besluiten: campagne-analyse-tool.md §13.
--
-- WAT ER VERANDERT
--  - marketing_analyse_opzetten: naam, formulier (campagne/rapportage), eventueel een vast
--    bedrijf, volgorde, actief. "Campagne analyse" is de standaard en heeft een vast id.
--  - marketing_analyse_prompts: een prompt hoort bij een opzet; het versienummer telt per opzet.
--  - marketing_analyse_campagnes: opzet_id (standaard Campagne analyse) en periode_tekst (de
--    open periode van een rapportage, bijv. "Afgelopen 3 maanden").
--  - marketing_analyse_versies: opzet_id, en het label mag leeg zijn (rapportages hebben er geen).
--  - marketing_analyse_bewaar: label alleen bij het formulier campagne; legt opzet en periode
--    vast in de briefing van de versie.

create table if not exists dataloket.marketing_analyse_opzetten (
  id              uuid primary key default gen_random_uuid(),
  naam            text not null check (length(trim(naam)) > 0),
  -- Welk briefingformulier: de volledige campagnebriefing (met funnel en kosten in het
  -- overzicht) of de rapportage (naam, periode, omschrijving).
  formulier       text not null check (formulier in ('campagne', 'rapportage')),
  -- Leeg: de gebruiker kiest het bedrijf in de briefing.
  bedrijf         text,
  volgorde        integer not null default 100,
  actief          boolean not null default true,
  standaard       boolean not null default false,
  aangemaakt_door uuid default auth.uid(),
  aangemaakt_op   timestamptz not null default now()
);

create unique index if not exists marketing_analyse_opzetten_naam
  on dataloket.marketing_analyse_opzetten (lower(naam));
create unique index if not exists marketing_analyse_opzetten_standaard
  on dataloket.marketing_analyse_opzetten (standaard) where standaard;

comment on table dataloket.marketing_analyse_opzetten is
  'Marketing analyse: de soorten analyse (analyse opzet), elk met een eigen prompt. Toevoegen en wijzigen: alleen de eigenaar (gecontroleerd in de route).';

insert into dataloket.marketing_analyse_opzetten (id, naam, formulier, bedrijf, volgorde, standaard, aangemaakt_door) values
  ('7d0c0000-0000-4000-8000-000000000001', 'Campagne analyse', 'campagne', null, 0, true, null),
  ('7d0c0000-0000-4000-8000-000000000002', 'VDU kwartaalrapportage', 'rapportage', 'Van den Udenhout', 10, false, null),
  ('7d0c0000-0000-4000-8000-000000000003', 'VDU maandrapportage', 'rapportage', 'Van den Udenhout', 20, false, null),
  ('7d0c0000-0000-4000-8000-000000000004', 'PGZ kwartaalrapportage', 'rapportage', 'PGZ', 30, false, null),
  ('7d0c0000-0000-4000-8000-000000000005', 'PGZ maandrapportage', 'rapportage', 'PGZ', 40, false, null)
on conflict (id) do nothing;

alter table dataloket.marketing_analyse_opzetten enable row level security;
drop policy if exists ma_opzetten_lezen on dataloket.marketing_analyse_opzetten;
create policy ma_opzetten_lezen on dataloket.marketing_analyse_opzetten
  for select to authenticated using (true);
drop policy if exists ma_opzetten_toevoegen on dataloket.marketing_analyse_opzetten;
create policy ma_opzetten_toevoegen on dataloket.marketing_analyse_opzetten
  for insert to authenticated with check (aangemaakt_door = auth.uid() and not standaard);
drop policy if exists ma_opzetten_wijzigen on dataloket.marketing_analyse_opzetten;
create policy ma_opzetten_wijzigen on dataloket.marketing_analyse_opzetten
  for update to authenticated using (true) with check (true);
drop policy if exists ma_opzetten_verwijderen on dataloket.marketing_analyse_opzetten;
create policy ma_opzetten_verwijderen on dataloket.marketing_analyse_opzetten
  for delete to authenticated using (not standaard);
grant select, insert, update, delete on dataloket.marketing_analyse_opzetten to authenticated;
grant all on dataloket.marketing_analyse_opzetten to service_role;

-- Prompts per opzet. Bestaande prompts (de hoofdprompt) horen bij Campagne analyse.
alter table dataloket.marketing_analyse_prompts
  add column if not exists opzet_id uuid references dataloket.marketing_analyse_opzetten (id) on delete cascade;
update dataloket.marketing_analyse_prompts
   set opzet_id = '7d0c0000-0000-4000-8000-000000000001' where opzet_id is null;
alter table dataloket.marketing_analyse_prompts alter column opzet_id set not null;
alter table dataloket.marketing_analyse_prompts drop constraint if exists marketing_analyse_prompts_versie_key;
create unique index if not exists marketing_analyse_prompts_opzet_versie
  on dataloket.marketing_analyse_prompts (opzet_id, versie);

-- Campagnes: welke opzet, en de open periode van een rapportage.
alter table dataloket.marketing_analyse_campagnes
  add column if not exists opzet_id uuid not null default '7d0c0000-0000-4000-8000-000000000001'
    references dataloket.marketing_analyse_opzetten (id) on delete restrict,
  add column if not exists periode_tekst text;

-- Versies: welke opzet, en geen label bij een rapportage.
alter table dataloket.marketing_analyse_versies
  add column if not exists opzet_id uuid references dataloket.marketing_analyse_opzetten (id) on delete set null;
update dataloket.marketing_analyse_versies v
   set opzet_id = c.opzet_id
  from dataloket.marketing_analyse_campagnes c
 where c.id = v.campagne_id and v.opzet_id is null;
alter table dataloket.marketing_analyse_versies alter column label drop not null;

-- Een analyse bewaren: zelfde handtekening, nu met opzet.
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
  v_o      dataloket.marketing_analyse_opzetten%rowtype;
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
  select * into v_o from dataloket.marketing_analyse_opzetten where id = v_c.opzet_id;

  v_versie := v_c.laatste_versie + 1;
  -- Alleen campagnes krijgen een label. Eindevaluatie zodra de einddatum voorbij is; is hij
  -- vandaag of later (of leeg), dan loopt de campagne nog: tussentijdse evaluatie.
  v_label := case
    when v_o.formulier = 'rapportage' then null
    when v_c.einddatum is not null and v_c.einddatum < v_vandaag then 'eind'
    else 'tussentijds'
  end;

  insert into dataloket.marketing_analyse_versies
    (campagne_id, versie, label, periode_van, periode_tot, briefing, prompt_id, semantiek_id,
     model, samenvatting, kerncijfers, resultaat, opzet_id)
  values (
    p_campagne_id, v_versie, v_label, p_periode_van, p_periode_tot,
    jsonb_build_object(
      'naam', v_c.naam,
      'opzet', v_o.naam,
      'formulier', v_o.formulier,
      'bedrijf', v_c.bedrijf,
      'merk', v_c.merk,
      'modellen', to_jsonb(v_c.modellen),
      'startdatum', v_c.startdatum,
      'einddatum', v_c.einddatum,
      'periodeTekst', v_c.periode_tekst,
      'doel', v_c.doel,
      'budget', v_c.budget,
      'omschrijving', v_c.omschrijving,
      'dataCorrectie', v_c.data_correctie
    ),
    p_prompt_id, p_semantiek_id, p_model, p_samenvatting,
    coalesce(p_kerncijfers, '{}'::jsonb), p_resultaat, v_c.opzet_id
  )
  returning id into v_id;

  update dataloket.marketing_analyse_campagnes
     set laatste_versie = v_versie,
         analyse_ronde = case when v_label = 'eind' then false else analyse_ronde end
   where id = p_campagne_id;

  return query select v_id, v_versie, v_label;
end;
$$;

revoke all on function dataloket.marketing_analyse_bewaar(uuid, jsonb, jsonb, text, date, date, uuid, uuid, text) from public;
grant execute on function dataloket.marketing_analyse_bewaar(uuid, jsonb, jsonb, text, date, date, uuid, uuid, text) to service_role;
