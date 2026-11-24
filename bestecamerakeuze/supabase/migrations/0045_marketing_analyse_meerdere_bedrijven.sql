-- Marketing analyse: een analyse (en een opzet) voor meerdere bedrijven
--
-- WAAROM DIT BESTAAT
-- Een analyse kan over meerdere van onze bedrijven gaan (bijv. PGZ en VELOO samen). Tot nu toe
-- stond er één bedrijf in de kolom `bedrijf`, zowel op de campagne als op een opzet met een vast
-- bedrijf. Nu is de lijst `bedrijven` leidend.
--
-- HOE
--  - `bedrijven text[]` op campagnes en opzetten, gevuld uit `bedrijf`.
--  - `bedrijf` blijft bestaan als leesbare kopie ("PGZ, VELOO"), bijgehouden door een trigger,
--    zodat oude code en oude SQL blijven werken. Schrijf en lees `bedrijven`.
--  - Een opzet zonder bedrijven: de gebruiker kiest ze in de briefing.
--  - marketing_analyse_bewaar legt `bedrijven` vast in de briefing van een versie.

alter table dataloket.marketing_analyse_campagnes
  add column if not exists bedrijven text[] not null default '{}';
update dataloket.marketing_analyse_campagnes
   set bedrijven = array[bedrijf]
 where cardinality(bedrijven) = 0 and bedrijf is not null and length(trim(bedrijf)) > 0;
alter table dataloket.marketing_analyse_campagnes alter column bedrijf drop not null;

alter table dataloket.marketing_analyse_opzetten
  add column if not exists bedrijven text[] not null default '{}';
update dataloket.marketing_analyse_opzetten
   set bedrijven = array[bedrijf]
 where cardinality(bedrijven) = 0 and bedrijf is not null and length(trim(bedrijf)) > 0;

comment on column dataloket.marketing_analyse_campagnes.bedrijf is
  'Leesbare kopie van bedrijven ("PGZ, VELOO"), bijgehouden door een trigger. Lees en schrijf bedrijven.';
comment on column dataloket.marketing_analyse_opzetten.bedrijf is
  'Leesbare kopie van bedrijven, bijgehouden door een trigger. Lees en schrijf bedrijven.';

-- Houdt bedrijf en bedrijven gelijk. Schrijft iemand alleen bedrijf (oude code), dan wordt dat
-- de lijst; anders volgt bedrijf de lijst.
create or replace function dataloket.marketing_analyse_bedrijven_bij()
returns trigger
language plpgsql
set search_path = dataloket, public
as $$
begin
  if coalesce(cardinality(new.bedrijven), 0) = 0 and new.bedrijf is not null and length(trim(new.bedrijf)) > 0 then
    new.bedrijven := array[trim(new.bedrijf)];
  end if;
  new.bedrijven := coalesce(new.bedrijven, '{}');
  new.bedrijf := nullif(array_to_string(new.bedrijven, ', '), '');
  return new;
end;
$$;

drop trigger if exists marketing_analyse_campagnes_bedrijven on dataloket.marketing_analyse_campagnes;
create trigger marketing_analyse_campagnes_bedrijven
  before insert or update on dataloket.marketing_analyse_campagnes
  for each row execute function dataloket.marketing_analyse_bedrijven_bij();

drop trigger if exists marketing_analyse_opzetten_bedrijven on dataloket.marketing_analyse_opzetten;
create trigger marketing_analyse_opzetten_bedrijven
  before insert or update on dataloket.marketing_analyse_opzetten
  for each row execute function dataloket.marketing_analyse_bedrijven_bij();

-- Een analyse bewaren: legt nu ook de lijst bedrijven vast.
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
  select * into v_c from dataloket.marketing_analyse_campagnes where id = p_campagne_id for update;
  if not found then
    raise exception 'Campagne % bestaat niet', p_campagne_id;
  end if;
  select * into v_o from dataloket.marketing_analyse_opzetten where id = v_c.opzet_id;

  v_versie := v_c.laatste_versie + 1;
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
      'bedrijven', to_jsonb(v_c.bedrijven),
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
