-- =====================================================================
-- Cadeaulijst (Gift Registry) feature
-- =====================================================================

-- ─── Tables ──────────────────────────────────────────────────────────

create table public.registry_settings (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references public.weddings(id) on delete cascade,
  is_enabled boolean not null default false,
  password text,
  intro_text text,
  bank_account_iban text,
  bank_account_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registry_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  type text not null check (type in ('gift', 'fund')),
  title text not null,
  description text,
  image_url text,
  shop_url text,
  target_amount integer,
  suggested_amounts integer[],
  payment_link text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registry_reservations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.registry_items(id) on delete cascade,
  cancel_token uuid not null default gen_random_uuid(),
  guest_name text not null,
  guest_email text not null,
  message text,
  reserved_at timestamptz not null default now(),
  unique(item_id)
);

create table public.registry_contributions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.registry_items(id) on delete cascade,
  guest_name text not null,
  guest_email text not null,
  amount integer not null,
  message text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'confirmed', 'cancelled')),
  payment_method text not null default 'bank_transfer'
    check (payment_method in ('bank_transfer', 'payment_link')),
  payment_reference text,
  confirmed_at timestamptz,
  contributed_at timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────

alter table public.registry_settings    enable row level security;
alter table public.registry_items       enable row level security;
alter table public.registry_reservations enable row level security;
alter table public.registry_contributions enable row level security;

-- registry_settings: only wedding members
create policy registry_settings_select on public.registry_settings
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy registry_settings_insert on public.registry_settings
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'registry'));

create policy registry_settings_update on public.registry_settings
  for update to authenticated
  using (public.can_edit(wedding_id, 'registry'))
  with check (public.can_edit(wedding_id, 'registry'));

-- registry_items: couple can manage; public reads via RPC only
create policy registry_items_select on public.registry_items
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy registry_items_insert on public.registry_items
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'registry'));

create policy registry_items_update on public.registry_items
  for update to authenticated
  using (public.can_edit(wedding_id, 'registry'))
  with check (public.can_edit(wedding_id, 'registry'));

create policy registry_items_delete on public.registry_items
  for delete to authenticated
  using (public.can_edit(wedding_id, 'registry'));

-- registry_reservations: anon can INSERT; couple can SELECT
create policy registry_reservations_insert on public.registry_reservations
  for insert to anon, authenticated
  with check (true);

create policy registry_reservations_select on public.registry_reservations
  for select to authenticated
  using (
    exists (
      select 1 from public.registry_items ri
      where ri.id = item_id
        and public.is_wedding_member(ri.wedding_id)
    )
  );

create policy registry_reservations_delete on public.registry_reservations
  for delete to anon, authenticated
  using (true);

-- registry_contributions: anon can INSERT; couple can SELECT; couple can UPDATE for confirming
create policy registry_contributions_insert on public.registry_contributions
  for insert to anon, authenticated
  with check (true);

create policy registry_contributions_select on public.registry_contributions
  for select to authenticated
  using (
    exists (
      select 1 from public.registry_items ri
      where ri.id = item_id
        and public.is_wedding_member(ri.wedding_id)
    )
  );

create policy registry_contributions_update on public.registry_contributions
  for update to authenticated
  using (
    exists (
      select 1 from public.registry_items ri
      where ri.id = item_id
        and public.can_edit(ri.wedding_id, 'registry')
    )
  )
  with check (
    exists (
      select 1 from public.registry_items ri
      where ri.id = item_id
        and public.can_edit(ri.wedding_id, 'registry')
    )
  );

-- Also allow anon/authenticated to update their own contribution for payment_method
-- (called when guest clicks "Ik heb betaald/overgemaakt")
create policy registry_contributions_update_self on public.registry_contributions
  for update to anon, authenticated
  using (payment_status = 'pending')
  with check (payment_status = 'pending');

-- ─── Public RPC (SECURITY DEFINER) ───────────────────────────────────

-- Returns the full public registry data for the guest-facing page.
-- Checks is_enabled; returns null if disabled or slug not found.
create or replace function public.get_public_registry(p_slug text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_wedding   public.weddings;
  v_content   public.website_content;
  v_settings  public.registry_settings;
  v_items     jsonb;
begin
  -- Resolve slug → wedding
  select wc.*, w.* into v_content, v_wedding
  from public.website_content wc
  join public.weddings w on w.id = wc.wedding_id
  where wc.slug = p_slug
  limit 1;

  if not found then
    return null;
  end if;

  -- Check registry enabled
  select * into v_settings
  from public.registry_settings
  where wedding_id = v_wedding.id;

  if not found or not v_settings.is_enabled then
    return jsonb_build_object('enabled', false);
  end if;

  -- Build items array with reservation + contribution aggregates
  select jsonb_agg(
    jsonb_build_object(
      'id',               ri.id,
      'type',             ri.type,
      'title',            ri.title,
      'description',      ri.description,
      'image_url',        ri.image_url,
      'shop_url',         ri.shop_url,
      'target_amount',    ri.target_amount,
      'suggested_amounts', ri.suggested_amounts,
      'payment_link',     ri.payment_link,
      'sort_order',       ri.sort_order,
      'is_reserved',      case when rr.id is not null then true else false end,
      'total_confirmed',  coalesce(rc.total_confirmed, 0),
      'total_pending',    coalesce(rc.total_pending, 0),
      'contributor_count', coalesce(rc.contributor_count, 0)
    )
    order by ri.sort_order, ri.created_at
  )
  into v_items
  from public.registry_items ri
  left join public.registry_reservations rr on rr.item_id = ri.id
  left join (
    select
      item_id,
      sum(case when payment_status = 'confirmed' then amount else 0 end) as total_confirmed,
      sum(case when payment_status = 'pending'   then amount else 0 end) as total_pending,
      count(case when payment_status in ('confirmed', 'pending') then 1 end) as contributor_count
    from public.registry_contributions
    group by item_id
  ) rc on rc.item_id = ri.id
  where ri.wedding_id = v_wedding.id
    and ri.is_visible = true;

  return jsonb_build_object(
    'enabled',           true,
    'password_required', v_settings.password is not null and v_settings.password <> '',
    'intro_text',        v_settings.intro_text,
    'bank_account_iban', v_settings.bank_account_iban,
    'bank_account_name', v_settings.bank_account_name,
    'wedding_id',        v_wedding.id,
    'partner1_naam',     v_wedding.partner1_naam,
    'partner2_naam',     v_wedding.partner2_naam,
    'trouwdatum',        v_wedding.trouwdatum,
    'items',             coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_public_registry(text) from public;
grant execute on function public.get_public_registry(text) to anon, authenticated;

-- RPC to check registry password
create or replace function public.check_registry_password(p_slug text, p_password text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_stored text;
begin
  select rs.password into v_stored
  from public.registry_settings rs
  join public.website_content wc on wc.wedding_id = rs.wedding_id
  where wc.slug = p_slug;

  if not found then
    return false;
  end if;

  -- No password set = always pass
  if v_stored is null or v_stored = '' then
    return true;
  end if;

  return v_stored = p_password;
end;
$$;

revoke all on function public.check_registry_password(text, text) from public;
grant execute on function public.check_registry_password(text, text) to anon, authenticated;

-- RPC to cancel a reservation by token (public, no auth needed)
create or replace function public.cancel_reservation_by_token(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
  v_slug    text;
begin
  select rr.item_id into v_item_id
  from public.registry_reservations rr
  where rr.cancel_token = p_token;

  if not found then
    return null;
  end if;

  -- Get wedding slug for redirect
  select wc.slug into v_slug
  from public.registry_items ri
  join public.website_content wc on wc.wedding_id = ri.wedding_id
  where ri.id = v_item_id;

  delete from public.registry_reservations where cancel_token = p_token;

  return v_slug;
end;
$$;

revoke all on function public.cancel_reservation_by_token(uuid) from public;
grant execute on function public.cancel_reservation_by_token(uuid) to anon, authenticated;
