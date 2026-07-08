-- =====================================================================
-- messages: het berichtencentrum (Postvak IN / Verzonden / Concepten).
-- Eén generieke tabel voor zowel systeem-/AI-berichten aan de gebruiker
-- (inbound) als communicatie naar leveranciers (outbound, offerte/contact).
-- Leveranciers-contact blijft ook in vendor_contact_requests staan (die
-- tabel verandert niet); de contact-route schrijft er voortaan een
-- spiegel-rij van naar messages, zodat de mailbox één simpele bron heeft.
-- Rechten: zichtbaar voor alle leden van de bruiloft (zelfde principe als
-- wedding_activity) — een mailbox is geen feature die je per rol afschermt.
-- =====================================================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  type text not null check (type in ('systeem', 'leverancier_offerte', 'leverancier_contact')),
  vendor_id uuid references public.vendors(id) on delete set null,
  onderwerp text not null default '',
  inhoud text not null default '',
  afzender_naam text not null default '',
  afzender_type text not null check (afzender_type in ('systeem', 'gebruiker', 'leverancier')),
  verzonden_door uuid references auth.users(id) on delete set null,
  status text not null default 'verzonden' check (status in ('concept', 'verzonden')),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_messages_wedding on public.messages(wedding_id, created_at desc);

alter table public.messages enable row level security;

-- Lezen mag elk lid van de bruiloft. Inserten mag alleen de spiegel-rij vanuit
-- de leveranciers-contactroute (zelfde rechten-check als vendor_contact_requests
-- zelf); systeemberichten komen los daarvan altijd via de SECURITY DEFINER
-- welkomst-trigger hieronder, niet via een client-insert.
create policy messages_select on public.messages for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy messages_insert on public.messages for insert to authenticated
  with check (public.can_edit(wedding_id, 'leveranciers'));

grant select, insert on public.messages to authenticated;
revoke all on public.messages from anon;

alter table public.messages replica identity full;
alter publication supabase_realtime add table public.messages;

-- =====================================================================
-- message_reads: per-gebruiker leesstatus (een bruiloft heeft vaak meerdere
-- leden, dus "gelezen" is niet gedeeld zoals bij vendor_contact_requests).
-- =====================================================================

create table public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_reads enable row level security;

create policy message_reads_select on public.message_reads for select to authenticated
  using (user_id = auth.uid());
create policy message_reads_insert on public.message_reads for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_wedding_member(m.wedding_id)
    )
  );

grant select, insert on public.message_reads to authenticated;
revoke all on public.message_reads from anon;

-- Server-autoritatief: user_id altijd de ingelogde gebruiker (zelfde patroon
-- als task_comments_prepare) — de client hoeft alleen message_id mee te geven.
create or replace function public.message_reads_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger trg_message_reads_prepare before insert on public.message_reads
  for each row execute function public.message_reads_prepare();

-- =====================================================================
-- Welkomstbericht: bij het aanmaken van een bruiloft meteen één
-- systeembericht in Postvak IN, zodat de mailbox niet blijvend leeg oogt.
-- =====================================================================

create or replace function public.insert_welcome_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.messages
    (wedding_id, direction, type, onderwerp, inhoud, afzender_naam, afzender_type, status)
  values (
    new.id,
    'inbound',
    'systeem',
    'Welkom bij je berichtencentrum',
    'Hier verschijnen straks updates en tips over jullie bruiloft, en een overzicht van berichten die jullie naar leveranciers hebben gestuurd.',
    'Bruiloft Assistent',
    'systeem',
    'verzonden'
  );
  return new;
end;
$$;

create trigger trg_insert_welcome_message
  after insert on public.weddings
  for each row execute function public.insert_welcome_message();
