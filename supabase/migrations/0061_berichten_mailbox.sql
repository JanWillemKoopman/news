-- =====================================================================
-- Berichtencentrum wordt een echte mailbox: archiveren/verwijderen (zacht,
-- herstelbaar) en vervolgberichten van het bruidspaar binnen een bestaand
-- gesprek (naast de al bestaande leverancier_offerte/_contact/_reactie).
-- Archiveren/verwijderen is gedeeld per bruiloft (net als de rest van
-- messages) — geen per-gebruiker staat zoals message_reads, want een
-- postvak is hier één gedeelde mailbox voor het hele bruidspaar/team.
-- =====================================================================

alter table public.messages
  add column archived_at timestamptz,
  add column deleted_at timestamptz;

alter table public.messages drop constraint messages_type_check;
alter table public.messages add constraint messages_type_check
  check (type in (
    'systeem',
    'leverancier_offerte',
    'leverancier_contact',
    'leverancier_reactie',
    'leverancier_vervolg'
  ));

-- De client mag alleen archiveren/verwijderen/herstellen (archived_at en
-- deleted_at), nooit de inhoud van een bericht wijzigen. RLS bepaalt WIE
-- (elk lid van de bruiloft), deze trigger bepaalt WAT er mag veranderen —
-- zelfde tweedeling als message_reads_prepare hierboven.
create or replace function public.messages_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.wedding_id := old.wedding_id;
  new.direction := old.direction;
  new.type := old.type;
  new.vendor_id := old.vendor_id;
  new.onderwerp := old.onderwerp;
  new.inhoud := old.inhoud;
  new.afzender_naam := old.afzender_naam;
  new.afzender_type := old.afzender_type;
  new.verzonden_door := old.verzonden_door;
  new.status := old.status;
  new.metadata := old.metadata;
  new.reply_token := old.reply_token;
  new.parent_message_id := old.parent_message_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger trg_messages_guard_update before update on public.messages
  for each row execute function public.messages_guard_update();

create policy messages_update on public.messages for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

grant update on public.messages to authenticated;
