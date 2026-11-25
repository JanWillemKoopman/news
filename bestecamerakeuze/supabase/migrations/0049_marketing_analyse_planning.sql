-- Marketing analyse: de planning (Uit, Wekelijks, Maandelijks, Per kwartaal).
--
-- Verzoek van de eigenaar (25 november 2026), zie campagne-analyse-tool.md §17. De schakelaar
-- Analyse ronde (Aan/Uit) wordt een keuze met vier standen. Elke vrijdag zegt de eigenaar in
-- Claude Code "voer de analyseronde uit"; de functie marketing_analyse_ronde bepaalt welke regels
-- dan aan de beurt zijn.
--
--  - Wekelijks: elke ronde (één keer per week, maandag t/m zondag).
--  - Maandelijks: vanaf de eerste vrijdag van de maand.
--  - Per kwartaal: vanaf de eerste vrijdag van januari, april, juli en oktober.
--  - Uit: nooit, ook geen eindevaluatie. Een losse analyse kan nog wel.
--
-- Een gemiste vrijdag wordt ingehaald: een regel blijft aan de beurt tot er sinds de geplande
-- week een versie is. Een campagne krijgt na de einddatum altijd een eindevaluatie (tenzij Uit);
-- daarna zet marketing_analyse_bewaar de Analyse ronde uit, en daarmee de planning op Uit.
-- Een geplande rapportage gaat over de vorige volle maand of het vorige volle kwartaal.
--
-- De kolom analyse_ronde blijft bestaan en loopt mee (planning <> 'uit'), zodat de bestaande
-- functies (marketing_analyse_bewaar, marketing_analyse_voorstel_toevoegen) ongewijzigd werken:
-- wie analyse_ronde aanzet krijgt de standaardplanning van de opzet, wie hem uitzet krijgt Uit.
--
-- Dezelfde rekenregel staat in TypeScript (lib/marketingAnalyse/planning.ts, getest) voor het
-- dashboard; houd ze gelijk.

-- 1. Standaardplanning per opzet ------------------------------------------------------------

alter table dataloket.marketing_analyse_opzetten
  add column if not exists standaard_planning text not null default 'uit';

alter table dataloket.marketing_analyse_opzetten
  drop constraint if exists marketing_analyse_opzetten_standaard_planning_check;
alter table dataloket.marketing_analyse_opzetten
  add constraint marketing_analyse_opzetten_standaard_planning_check
  check (standaard_planning in ('uit', 'week', 'maand', 'kwartaal'));

update dataloket.marketing_analyse_opzetten set standaard_planning = 'week'
  where id = '7d0c0000-0000-4000-8000-000000000001';
update dataloket.marketing_analyse_opzetten set standaard_planning = 'kwartaal'
  where id in ('7d0c0000-0000-4000-8000-000000000002', '7d0c0000-0000-4000-8000-000000000004');
update dataloket.marketing_analyse_opzetten set standaard_planning = 'maand'
  where id in ('7d0c0000-0000-4000-8000-000000000003', '7d0c0000-0000-4000-8000-000000000005');

comment on column dataloket.marketing_analyse_opzetten.standaard_planning is
  'De planning die een nieuwe analyse met deze opzet krijgt: uit, week, maand of kwartaal. Per analyse aan te passen.';

-- 2. Planning per analyse --------------------------------------------------------------------

alter table dataloket.marketing_analyse_campagnes add column if not exists planning text;

update dataloket.marketing_analyse_campagnes c
   set planning = case
         when c.analyse_ronde then coalesce(nullif(o.standaard_planning, 'uit'), 'week')
         else 'uit'
       end
  from dataloket.marketing_analyse_opzetten o
 where o.id = c.opzet_id and c.planning is null;
update dataloket.marketing_analyse_campagnes set planning = 'uit' where planning is null;

alter table dataloket.marketing_analyse_campagnes alter column planning set not null;
alter table dataloket.marketing_analyse_campagnes
  drop constraint if exists marketing_analyse_campagnes_planning_check;
alter table dataloket.marketing_analyse_campagnes
  add constraint marketing_analyse_campagnes_planning_check
  check (planning in ('uit', 'week', 'maand', 'kwartaal'));

comment on column dataloket.marketing_analyse_campagnes.planning is
  'Hoe vaak de analyseronde deze analyse maakt: uit, week, maand (eerste vrijdag) of kwartaal (eerste vrijdag van jan, apr, jul, okt). Zie marketing_analyse_ronde.';
comment on column dataloket.marketing_analyse_campagnes.analyse_ronde is
  'Loopt mee met planning (planning <> uit), via de trigger marketing_analyse_campagnes_planning. Lees en schrijf planning.';

-- planning en analyse_ronde lopen gelijk; een nieuwe analyse zonder planning krijgt die van de opzet.
create or replace function dataloket.marketing_analyse_planning_bij()
returns trigger
language plpgsql
set search_path = dataloket, pg_temp
as $$
declare
  v_std text;
begin
  select o.standaard_planning into v_std from dataloket.marketing_analyse_opzetten o where o.id = new.opzet_id;
  v_std := coalesce(v_std, 'uit');

  if tg_op = 'INSERT' then
    if new.planning is null then
      new.planning := case
        when v_std <> 'uit' then v_std
        when new.analyse_ronde then 'week'
        else 'uit'
      end;
    end if;
  elsif new.planning is not distinct from old.planning
    and new.analyse_ronde is distinct from old.analyse_ronde then
    -- Iemand (of een oudere functie) zette alleen analyse_ronde om.
    new.planning := case
      when new.analyse_ronde then case when v_std <> 'uit' then v_std else 'week' end
      else 'uit'
    end;
  end if;

  new.planning := coalesce(new.planning, 'uit');
  new.analyse_ronde := new.planning <> 'uit';
  return new;
end;
$$;

drop trigger if exists marketing_analyse_campagnes_planning on dataloket.marketing_analyse_campagnes;
create trigger marketing_analyse_campagnes_planning
  before insert or update on dataloket.marketing_analyse_campagnes
  for each row execute function dataloket.marketing_analyse_planning_bij();

-- 3. Datumhulpjes (ISO-week: maandag t/m zondag) ----------------------------------------------

create or replace function dataloket.ma_volgende_vrijdag(p_datum date)
returns date language sql immutable
as $$ select p_datum + ((5 - extract(isodow from p_datum)::int + 7) % 7) $$;

create or replace function dataloket.ma_vrijdag_van_week(p_datum date)
returns date language sql immutable
as $$ select date_trunc('week', p_datum)::date + 4 $$;

create or replace function dataloket.ma_eerste_vrijdag(p_datum date)
returns date language sql immutable
as $$ select dataloket.ma_volgende_vrijdag(date_trunc('month', p_datum)::date) $$;

-- 4. De analyseronde --------------------------------------------------------------------------

create or replace function dataloket.marketing_analyse_ronde(
  p_datum date default (now() at time zone 'Europe/Amsterdam')::date
)
returns table (
  campagne_id      uuid,
  naam             text,
  opzet            text,
  formulier        text,
  planning         text,
  aan_de_beurt     boolean,
  reden            text,
  volgende         date,
  periode_van      date,
  periode_tot      date,
  laatste_analyse  date
)
language plpgsql
stable
security invoker
set search_path = dataloket, pg_temp
as $$
declare
  r          record;
  v_vrijdag  date := dataloket.ma_vrijdag_van_week(p_datum);
  v_maandag  date := dataloket.ma_vrijdag_van_week(p_datum) - 4;
  v_gisteren date := p_datum - 1;
  v_gepland  date;
  v_drempel  date;
  v_ref      date;
  v_campagne boolean;
begin
  for r in
    select c.id, c.naam, o.naam as opzet_naam, o.formulier, c.planning, c.startdatum, c.einddatum,
           (select max((v.geanalyseerd_op at time zone 'Europe/Amsterdam')::date)
              from dataloket.marketing_analyse_versies v where v.campagne_id = c.id) as laatste
      from dataloket.marketing_analyse_campagnes c
      join dataloket.marketing_analyse_opzetten o on o.id = c.opzet_id
     order by o.formulier, c.naam
  loop
    campagne_id := r.id;
    naam := r.naam;
    opzet := r.opzet_naam;
    formulier := r.formulier;
    planning := r.planning;
    laatste_analyse := r.laatste;
    aan_de_beurt := false;
    volgende := null;
    periode_van := null;
    periode_tot := null;
    v_ref := null;
    v_campagne := r.formulier = 'campagne';

    if r.planning = 'uit' then
      reden := 'uit';

    elsif v_campagne and r.startdatum is not null and r.startdatum >= p_datum then
      -- Nog geen volle dag data: de eerste ronde na de start.
      reden := 'nog niet gestart';
      volgende := dataloket.ma_volgende_vrijdag(r.startdatum + 1);

    elsif v_campagne and r.einddatum is not null and r.einddatum < p_datum then
      aan_de_beurt := true;
      reden := 'eindevaluatie';
      volgende := dataloket.ma_volgende_vrijdag(p_datum);

    else
      if r.planning = 'week' then
        v_gepland := v_vrijdag;
      elsif r.planning = 'maand' then
        v_gepland := dataloket.ma_eerste_vrijdag(v_vrijdag);
      else
        v_gepland := dataloket.ma_eerste_vrijdag(date_trunc('quarter', v_vrijdag)::date);
      end if;
      -- Een versie uit de week van de geplande vrijdag (of later) telt.
      v_drempel := v_gepland - 4;

      if r.laatste is null or r.laatste < v_drempel then
        aan_de_beurt := true;
        volgende := dataloket.ma_volgende_vrijdag(p_datum);
        v_ref := v_gepland;
        reden := case
          when r.laatste is null then 'eerste analyse'
          when r.planning <> 'week' and v_drempel < v_maandag then 'ingehaald'
          when r.planning = 'week' then 'wekelijks'
          when r.planning = 'maand' then 'maandelijks'
          else 'per kwartaal'
        end;
      else
        volgende := case r.planning
          when 'week' then v_vrijdag + 7
          when 'maand' then dataloket.ma_eerste_vrijdag((date_trunc('month', v_vrijdag) + interval '1 month')::date)
          else dataloket.ma_eerste_vrijdag((date_trunc('quarter', v_vrijdag) + interval '3 months')::date)
        end;
        v_ref := volgende;
        reden := 'gepland';
        if v_campagne and r.einddatum is not null and r.einddatum < volgende then
          volgende := dataloket.ma_volgende_vrijdag(r.einddatum + 1);
          reden := 'eindevaluatie gepland';
        end if;
      end if;
    end if;

    -- De periode van de analyse.
    if v_campagne and aan_de_beurt then
      periode_van := r.startdatum;
      periode_tot := least(coalesce(r.einddatum, v_gisteren), v_gisteren);
    elsif not v_campagne and v_ref is not null and r.planning in ('maand', 'kwartaal') then
      if r.planning = 'maand' then
        periode_van := (date_trunc('month', v_ref) - interval '1 month')::date;
        periode_tot := date_trunc('month', v_ref)::date - 1;
      else
        periode_van := (date_trunc('quarter', v_ref) - interval '3 months')::date;
        periode_tot := date_trunc('quarter', v_ref)::date - 1;
      end if;
      if aan_de_beurt then periode_tot := least(periode_tot, v_gisteren); end if;
    end if;

    return next;
  end loop;
end;
$$;

comment on function dataloket.marketing_analyse_ronde(date) is
  'De analyseronde: per analyse of hij op p_datum (standaard vandaag, Nederlandse kalender) aan de beurt is, waarom, wanneer de volgende keer is en over welke periode. Een rapportage met planning maand of kwartaal gaat over de vorige volle maand of het vorige volle kwartaal; bij week of uit geldt periode_tekst. Gebruikt door de skill marketing-analyse.';

grant execute on function dataloket.marketing_analyse_ronde(date) to authenticated, service_role;
grant execute on function dataloket.ma_volgende_vrijdag(date), dataloket.ma_vrijdag_van_week(date),
  dataloket.ma_eerste_vrijdag(date) to authenticated, service_role;
