-- Marketing analyse: logboek van de verzonden e-mails, per adres.
--
-- Verzoek van de eigenaar (25 november 2026): achter het schildje Beheer een overzicht van
-- alle verzonden analyses, zodat precies te zien is wie wanneer welke analyse per mail kreeg.
-- Tot nu toe bewaarde de versie alleen hoeveel mails er gingen (notificatie_aantal, migratie
-- 0043), niet naar welke adressen. Vanaf deze migratie schrijft lib/marketingAnalyse/notificatie.ts
-- per adres een regel, ook als het versturen mislukt. Eerdere mails zijn niet per adres terug te
-- halen; het overzicht toont die versies met alleen het aantal.
--
-- De naam van de campagne, het versienummer en het label worden meegeschreven, zodat het
-- logboek klopt als een versie of campagne later wordt verwijderd.
--
-- Alleen de eigenaar ziet het overzicht: de route leest via de dienstverbinding na een controle
-- op isBeheerder. Er is daarom bewust geen leesrecht voor authenticated.

create table if not exists dataloket.marketing_analyse_mail_log (
  id            uuid primary key default gen_random_uuid(),
  versie_id     uuid references dataloket.marketing_analyse_versies (id) on delete set null,
  campagne_id   uuid references dataloket.marketing_analyse_campagnes (id) on delete set null,
  campagne_naam text not null,
  versie        integer not null,
  label         text,
  email         text not null,
  onderwerp     text,
  verstuurd_op  timestamptz not null default now(),
  gelukt        boolean not null,
  fout          text
);

create index if not exists marketing_analyse_mail_log_op_idx
  on dataloket.marketing_analyse_mail_log (verstuurd_op desc);
create index if not exists marketing_analyse_mail_log_versie_idx
  on dataloket.marketing_analyse_mail_log (versie_id);

comment on table dataloket.marketing_analyse_mail_log is
  'Marketing analyse: per adres welke analyse (campagne, versie) wanneer per mail is verstuurd, en of dat lukte. Geschreven door de notificatieroute; gelezen door het overzicht Verzonden e-mails (alleen de eigenaar).';

alter table dataloket.marketing_analyse_mail_log enable row level security;
grant all on dataloket.marketing_analyse_mail_log to service_role;
