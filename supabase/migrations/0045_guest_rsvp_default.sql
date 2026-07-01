-- Nieuwe RSVP-status 'nog niet uitgenodigd' als default bij het aanmaken van
-- een gast (i.p.v. 'uitgenodigd'), zodat duidelijk is dat er nog geen
-- uitnodiging is verstuurd en er actie nodig is.
alter table public.guests drop constraint if exists guests_rsvp_status_check;
alter table public.guests add constraint guests_rsvp_status_check
  check (rsvp_status in (
    'nog niet uitgenodigd', 'uitgenodigd', 'bevestigd', 'afgemeld', 'geen reactie'
  ));
alter table public.guests alter column rsvp_status set default 'nog niet uitgenodigd';
