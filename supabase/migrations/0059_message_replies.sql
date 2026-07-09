-- =====================================================================
-- Leveranciersreacties zonder login: elk uitgaand leveranciersbericht
-- krijgt een reply_token. De e-mail aan de leverancier bevat een knop naar
-- /reactie/<token>; de reactie wordt (server-side, via de service-role in
-- /api/reactie/[token]) als inbound 'leverancier_reactie'-bericht aan het
-- berichtencentrum toegevoegd, gekoppeld via parent_message_id.
-- Zelfde token-model als de persoonlijke RSVP-links (0056): de token in de
-- e-mail ís de identiteit, er is geen account of wachtwoord nodig.
-- =====================================================================

alter table public.messages
  add column reply_token uuid unique,
  add column parent_message_id uuid references public.messages(id) on delete set null;

-- Reacties van leveranciers als nieuw berichttype.
alter table public.messages drop constraint messages_type_check;
alter table public.messages add constraint messages_type_check
  check (type in ('systeem', 'leverancier_offerte', 'leverancier_contact', 'leverancier_reactie'));

-- Reacties per gesprek ophalen (publieke reactiepagina toont de mini-thread).
create index idx_messages_parent on public.messages(parent_message_id)
  where parent_message_id is not null;
