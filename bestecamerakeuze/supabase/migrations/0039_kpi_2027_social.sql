-- KPI's 2027 social media: de stand per account per jaar, en het groeipercentage per KPI.
--
-- WAT ER IN STAAT
-- Net als kpi_2027_standen (0035) de ruwe cijfers, niet de KPI's of het target. Eén rij per
-- account (kanaal:account-id, bv. 'instagram:17841400383959539') per jaar, elke zondag
-- overschreven t/m zaterdag; 2026 wordt definitief na de jaarwisseling.
--
--   dagen = {"vertoningen": {"2026-01-01": 9912, …},   -- per dag, optelbaar
--            "volgers":     {"2026-11-20": 3772, …}}   -- de stand aan het eind van die dag
--
-- Welk account bij welk merk en welke KPI hoort, en het groeipercentage dat het team per
-- KPI vastlegde, staan in lib/kpi2027social/definities.ts; het rekenwerk in rekenen.ts.
--
-- Instagram kent geen volgershistorie (alleen de stand van vandaag). Die rijen bouwen hun
-- reeks dus op: de ophaalactie voegt de stand van vandaag toe aan wat er al stond, en neemt
-- de nachtelijke momentopnames uit windsor_account_dag mee.

create table if not exists dataloket.kpi_2027_social_standen (
  account     text        not null,  -- 'kanaal:account-id'
  jaar        smallint    not null,  -- 2026 (de basis) of 2027 (de realisatie)
  peildatum   date        not null,  -- t/m welke dag: altijd een zaterdag, of 31 december
  berekend_op timestamptz not null default now(),
  definitief  boolean     not null default false,
  dagen       jsonb       not null,
  primary key (account, jaar)
);

comment on table dataloket.kpi_2027_social_standen is
  'Per social-account en jaar de cijfers achter het tabblad KPI''s 2027 social media: vertoningen per dag en de volgersstand per dag. Elke zondag overschreven t/m zaterdag.';

-- Alleen de eigenaar (de ophaalactie) schrijft; de app leest via de view.
alter table dataloket.kpi_2027_social_standen enable row level security;

create or replace view dataloket.v_kpi_2027_social_standen as
select account, jaar, peildatum, berekend_op, definitief, dagen
  from dataloket.kpi_2027_social_standen;

comment on view dataloket.v_kpi_2027_social_standen is
  'Per social-account en jaar de cijfers achter KPI''s 2027 social media (dagen: vertoningen → datum → aantal; volgers → datum → stand). Koppeling, groei en target staan in de code.';

grant select on dataloket.v_kpi_2027_social_standen to dataloket_lezer;

-- Het groeipercentage (0036) ook voor dit tabblad. Hier is geen rij het percentage dat het
-- team per KPI vastlegde (niet +5%).
alter table dataloket.kpi_2027_groei drop constraint if exists kpi_2027_groei_tabblad_check;
alter table dataloket.kpi_2027_groei
  add constraint kpi_2027_groei_tabblad_check
  check (tabblad in ('kpi-2027', 'kpi-2027-syntec', 'kpi-2027-social'));

-- De Instagram-volgers in windsor_account_dag zijn een momentopname per nacht (de API kent
-- geen historie). De nachtelijke sync schrijft de dagen ervóór opnieuw met een lege
-- volgerskolom; vanaf nu laat hij een bekende stand staan (lib/windsor/sync.ts).
