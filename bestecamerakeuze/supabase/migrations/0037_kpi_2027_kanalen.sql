-- De kanaalverdeling achter het knopje "Kanalen" op KPI's 2027 GA (nu alleen udenhout.nl).
--
-- Per website één rij, elke week overschreven: per bron (sessies, gebruikers,
-- event:<naam>) per maand het aantal per kanaal, vanaf januari 2025. De kanalen zijn al
-- ingedeeld (lib/kpi2027/kanalen.ts, op GA4's sessiebron/medium): ruwe bron/media per
-- maand zouden de rij honderden kilobytes maken, terwijl de grafiek alleen de acht groepen
-- toont. Een aangepaste indeling geldt dus pas na de volgende ophaalronde (zondag, of
-- "Nu bijwerken"), niet meteen.
--
-- `voorbeelden` bewaart per kanaal de grootste bron/media over de hele periode, zodat op
-- het scherm te zien is wat er in een groep zit.
create table if not exists dataloket.kpi_2027_kanalen (
  website     text        primary key,  -- sleutel uit lib/kpi2027/definities.ts
  van         date        not null,     -- altijd 2025-01-01
  peildatum   date        not null,     -- t/m welke dag: de laatste zaterdag
  berekend_op timestamptz not null default now(),
  -- {"sessies": {"2025-01": {"google-ads": 41230, "autoportals": 15876, …}, …}, "event:…": {…}}
  bronnen     jsonb       not null,
  -- {"autoportals": [{"bronMedium": "gaspedaal.nl / referral", "sessies": 294335}, …], …}
  voorbeelden jsonb       not null
);

comment on table dataloket.kpi_2027_kanalen is
  'Per website de kanaalverdeling achter KPI''s 2027 GA: per bron (sessies, gebruikers, event) per maand het aantal per kanaal, vanaf januari 2025. Elke zondag overschreven.';

-- Alleen de eigenaar (de ophaalactie) schrijft; de app leest via de view.
alter table dataloket.kpi_2027_kanalen enable row level security;

create or replace view dataloket.v_kpi_2027_kanalen as
select website, van, peildatum, berekend_op, bronnen, voorbeelden
  from dataloket.kpi_2027_kanalen;

comment on view dataloket.v_kpi_2027_kanalen is
  'Per website de kanaalverdeling van KPI''s 2027 GA (bronnen: bron → maand → kanaal → aantal). De indeling in kanalen staat in lib/kpi2027/kanalen.ts van het dashboard.';

grant select on dataloket.v_kpi_2027_kanalen to dataloket_lezer;
