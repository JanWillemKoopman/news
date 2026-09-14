-- Welke conversie-actie telt als conversie?
--
-- WAAROM DIT BESTAAT
-- Meta kent geen kaal "conversions"-veld. De sync loste dat op door álle maatwerkacties
-- die Windsor teruggaf bij elkaar op te tellen en dat de conversies van die rij te
-- noemen. Dat getal is in Ads Manager nergens terug te vinden, en het telt bovendien
-- dubbel: één ingevuld formulier dat zowel een pixelconversie als een leadactie afvuurt,
-- verschijnt er twee keer in. In de praktijk leverde dat campagnes op met meer conversies
-- dan de helft van hun kliks.
--
-- Dit is dezelfde vraag als bij leads, en krijgt daarom hetzelfde antwoord: niet de
-- computer laat raden wat een conversie is, het team wijst het aan. Eén kolom erbij op de
-- catalogus die er al staat — geen tweede tabel, want dat zou een tweede waarheid zijn
-- over dezelfde velden.
alter table dataloket.windsor_conversie_acties
  add column if not exists telt_als_conversie boolean not null default false;

comment on column dataloket.windsor_conversie_acties.telt_als_conversie is
  'Telt deze conversie-actie mee in de conversiekolom van de kanaalpagina''s? Alleen van belang voor Meta: Google levert zelf al een conversietotaal waar deze acties in zitten. Handmatig gezet via Koppeltabel → Conversie-acties.';

-- ---------------------------------------------------------------------------
-- De historische Meta-conversies terug naar nul
-- ---------------------------------------------------------------------------
--
-- De sync schrijft voortaan nul in deze kolom voor Meta; de conversies worden bij het
-- lezen opgebouwd uit de aangewezen acties. De rijen van vóór deze migratie dragen nog de
-- oude optelsom, en die zou zich bij elke query bij de nieuwe telling optellen — precies
-- het dubbeltellen dat hiermee de wereld uit moet.
--
-- Er gaat niets verloren: elke losse actie staat nog per rij in `conversie_acties`, dus
-- het oude getal is op elk moment opnieuw uit te rekenen. Google en LinkedIn blijven
-- ongemoeid; die leveren wél een eigen conversietotaal.
update dataloket.windsor_advertenties
   set conversies = 0
 where bron = 'meta' and conversies <> 0;

-- ---------------------------------------------------------------------------
-- De keuzelijst op de Koppeltabel
-- ---------------------------------------------------------------------------
--
-- `create or replace view` kan alleen kolommen áchteraan toevoegen. telt_als_conversie
-- hoort naast telt_als_lead te staan, dus de view valt eerst. Er hangt niets aan behalve
-- de leesrechten, die onderaan opnieuw worden gezet.
drop view if exists dataloket.v_conversie_acties;

create view dataloket.v_conversie_acties as
with gebruik as (
  select e.key                            as veld,
         sum((e.value)::text::numeric)    as aantal,
         min(w.account_naam)              as account,
         max(w.datum)                     as laatst_actief
    from dataloket.windsor_advertenties w
    cross join lateral jsonb_each(coalesce(w.conversie_acties, '{}'::jsonb)) as e(key, value)
   where w.datum >= current_date - interval '90 days'
   group by e.key
)
select a.veld,
       a.bron,
       a.label,
       a.telt_als_lead,
       a.telt_als_conversie,
       a.gewijzigd,
       coalesce(g.aantal, 0)                     as aantal,
       g.account,
       coalesce(g.laatst_actief, a.laatst_gezien) as laatst_gezien
  from dataloket.windsor_conversie_acties a
  left join gebruik g on g.veld = a.veld
 -- Een al aangewezen actie blijft in beeld, ook in een periode waarin hij niet vuurde:
 -- anders verdwijnt juist de regel die iemand bewust heeft aangezet.
 where coalesce(g.aantal, 0) > 0 or a.telt_als_lead or a.telt_als_conversie;

comment on view dataloket.v_conversie_acties is
  'De conversie-acties die de laatste 90 dagen daadwerkelijk voorkwamen (plus de al aangewezen acties), met hun volume. Voedt de keuzelijst op de pagina Koppeltabel. account is een aanwijzing: bij een actie die bij meerdere accounts voorkomt staat er één naam.';

grant select on dataloket.v_conversie_acties to dataloket_lezer;
