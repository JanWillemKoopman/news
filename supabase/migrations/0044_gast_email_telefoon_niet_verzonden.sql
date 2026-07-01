-- Voeg e-mail en telefoon toe aan gasten (nodig om RSVP-uitnodigingen per
-- e-mail/WhatsApp te versturen), en voeg 'niet verzonden' toe als RSVP-status:
-- nieuwe gasten starten in deze staat totdat er daadwerkelijk een
-- uitnodiging is verstuurd, i.p.v. meteen als 'uitgenodigd' te tellen.

alter table public.guests
  add column email text not null default '',
  add column telefoon text not null default '';

alter table public.guests drop constraint if exists guests_rsvp_status_check;
alter table public.guests add constraint guests_rsvp_status_check check (rsvp_status in (
  'niet verzonden', 'uitgenodigd', 'bevestigd', 'afgemeld', 'geen reactie'
));
alter table public.guests alter column rsvp_status set default 'niet verzonden';
