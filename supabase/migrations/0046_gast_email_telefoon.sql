-- Voeg e-mail en telefoon toe aan gasten, nodig om RSVP-uitnodigingen per
-- e-mail/WhatsApp te versturen vanuit de gastenlijst.
alter table public.guests
  add column email text not null default '',
  add column telefoon text not null default '';
