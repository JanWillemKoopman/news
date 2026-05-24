-- Volledige database-structuur voor de bruiloftplanner.
-- Gegenereerd uit supabase/migrations/* — plak dit één keer in de Supabase SQL Editor (Run).
-- (Voor ontwikkelaars: gebruik liever 'supabase db push'.)


-- ============================================================
-- supabase/migrations/0001_extensions.sql
-- ============================================================

-- Extensies. pgcrypto levert gen_random_bytes() voor onraadbare RSVP-/invite-tokens.
-- (gen_random_uuid() zit in de core sinds PG13 en hoeft niet uit een extensie.)
create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- supabase/migrations/0002_profiles.sql
-- ============================================================

-- Profielen: één rij per auth-gebruiker. app_role is de PLATFORM-laag
-- (member = gewone gebruiker, platform_admin = operator/support).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  app_role text not null default 'member' check (app_role in ('member', 'platform_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Eén profiel per auth-gebruiker; app_role = platform-laag.';

-- updated_at automatisch bijwerken (hergebruikt door alle tabellen met updated_at).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatisch een profiel aanmaken bij registratie.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- supabase/migrations/0003_core_tables.sql
-- ============================================================

-- =====================================================================
-- Kerntabellen. Alles hangt onder een wedding (tenant). Eigenaarschap leeft
-- in wedding_members; de rechten-matrix in wedding_role_permissions.
-- Kruis-entiteit-FK's worden NA alle tabellen toegevoegd (circulaire refs).
-- =====================================================================

-- --- weddings --------------------------------------------------------
create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  partner1_naam text not null default '',
  partner2_naam text not null default '',
  trouwdatum date,
  locatie text not null default '',
  totaal_budget numeric(12, 2) not null default 0,
  aantal_daggasten integer not null default 0,
  aantal_avondgasten integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --- wedding_members (eigenaarschap + delen) -------------------------
create table public.wedding_members (
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'planner', 'helper', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);
create index idx_wedding_members_user on public.wedding_members(user_id);

-- --- wedding_role_permissions (de aanpasbare rechten-matrix) ---------
-- owner staat NIET in deze tabel (heeft altijd 'edit' op alles).
create table public.wedding_role_permissions (
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  role text not null check (role in ('planner', 'helper', 'viewer')),
  module text not null check (module in (
    'dashboard', 'taken', 'budget', 'leveranciers', 'gasten',
    'website', 'draaiboek', 'tafels', 'beheer'
  )),
  level text not null check (level in ('none', 'view', 'edit')),
  primary key (wedding_id, role, module)
);

-- --- wedding_invites (partner/helper uitnodigen) --------------------
create table public.wedding_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  email text not null,
  role text not null default 'helper' check (role in ('planner', 'helper', 'viewer')),
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz
);
create index idx_wedding_invites_wedding on public.wedding_invites(wedding_id);

-- --- tables (tafelschikking) — vóór guests i.v.m. FK ----------------
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  naam text not null default '',
  vorm text not null default 'rond' check (vorm in ('rond', 'vierkant', 'langwerpig')),
  capaciteit integer not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tables_wedding on public.tables(wedding_id);

-- --- vendors --------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  naam text not null default '',
  type text not null check (type in (
    'locatie', 'catering', 'fotograaf', 'videograaf', 'dj of band',
    'bloemist', 'kleding', 'vervoer', 'taart', 'overig'
  )),
  status text not null default 'te bezoeken' check (status in (
    'te bezoeken', 'bezocht', 'offerte aangevraagd', 'geboekt', 'afgewezen'
  )),
  contactpersoon text not null default '',
  telefoon text not null default '',
  email text not null default '',
  website text not null default '',
  geoffreerd_bedrag numeric(12, 2) not null default 0,
  notitie text not null default '',
  budget_item_id uuid, -- FK toegevoegd onderaan (circulair met budget_items)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_vendors_wedding on public.vendors(wedding_id);

-- --- budget_items ---------------------------------------------------
create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  categorie text not null check (categorie in (
    'locatie', 'catering', 'kleding', 'fotografie en video', 'muziek',
    'bloemen en decoratie', 'vervoer', 'taart', 'uitnodigingen en drukwerk',
    'ringen', 'overig'
  )),
  omschrijving text not null default '',
  geschat_bedrag numeric(12, 2) not null default 0,
  geoffreerd_bedrag numeric(12, 2) not null default 0,
  betaald_bedrag numeric(12, 2) not null default 0,
  vendor_id uuid, -- FK toegevoegd onderaan
  betaaltermijnen jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_budget_items_wedding on public.budget_items(wedding_id);

-- --- guests ---------------------------------------------------------
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  voornaam text not null default '',
  achternaam text not null default '',
  categorie text not null check (categorie in (
    'familie partner 1', 'familie partner 2', 'vrienden', 'collega''s', 'overig'
  )),
  gasttype text not null default 'daggast' check (gasttype in ('daggast', 'avondgast')),
  rsvp_status text not null default 'uitgenodigd' check (rsvp_status in (
    'uitgenodigd', 'bevestigd', 'afgemeld', 'geen reactie'
  )),
  dieetwensen text not null default '',
  heeft_partner boolean not null default false,
  partner_naam text not null default '',
  aantal_kinderen integer not null default 0,
  adres text not null default '',
  notitie text not null default '',
  tafel_id uuid, -- FK toegevoegd onderaan (-> tables)
  rsvp_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  rsvp_submitted_at timestamptz,
  rsvp_token_revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_guests_wedding on public.guests(wedding_id);

-- --- tasks ----------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  titel text not null default '',
  omschrijving text not null default '',
  deadline date,
  tijdsblok text not null default 'na de bruiloft' check (tijdsblok in (
    '12 maanden voor', '9 maanden voor', '6 maanden voor', '3 maanden voor',
    '1 maand voor', 'laatste week', 'trouwweek', 'na de bruiloft'
  )),
  status text not null default 'open' check (status in ('open', 'bezig', 'klaar')),
  prioriteit text not null default 'midden' check (prioriteit in ('laag', 'midden', 'hoog')),
  toegewezen_aan text not null default 'samen' check (toegewezen_aan in (
    'partner 1', 'partner 2', 'samen', 'getuige', 'overig'
  )),
  vendor_id uuid, -- FK toegevoegd onderaan
  budget_item_id uuid, -- FK toegevoegd onderaan
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_wedding on public.tasks(wedding_id);

-- --- schedule_items (trouwdag-draaiboek) ----------------------------
create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  tijd text not null default '',
  titel text not null default '',
  omschrijving text not null default '',
  locatie text not null default '',
  betrokkenen jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_schedule_items_wedding on public.schedule_items(wedding_id);

-- --- website_content (één per wedding -> upsert) --------------------
create table public.website_content (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references public.weddings(id) on delete cascade,
  welkomsttekst text not null default '',
  dresscode text not null default '',
  cadeaulijst text not null default '',
  hotels text not null default '',
  routebeschrijving text not null default '',
  contact text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Kruis-entiteit-FK's (na alle tabellen i.v.m. circulaire referenties).
-- Allemaal ON DELETE SET NULL: een verwijderde leverancier/budgetregel
-- ontkoppelt, maar verwijdert de gast/taak niet.
-- =====================================================================
alter table public.guests
  add constraint fk_guests_tafel foreign key (tafel_id)
  references public.tables(id) on delete set null;

alter table public.vendors
  add constraint fk_vendors_budget_item foreign key (budget_item_id)
  references public.budget_items(id) on delete set null;

alter table public.budget_items
  add constraint fk_budget_items_vendor foreign key (vendor_id)
  references public.vendors(id) on delete set null;

alter table public.tasks
  add constraint fk_tasks_vendor foreign key (vendor_id)
  references public.vendors(id) on delete set null;

alter table public.tasks
  add constraint fk_tasks_budget_item foreign key (budget_item_id)
  references public.budget_items(id) on delete set null;

-- =====================================================================
-- updated_at-triggers
-- =====================================================================
create trigger trg_weddings_updated_at before update on public.weddings
  for each row execute function public.set_updated_at();
create trigger trg_tables_updated_at before update on public.tables
  for each row execute function public.set_updated_at();
create trigger trg_vendors_updated_at before update on public.vendors
  for each row execute function public.set_updated_at();
create trigger trg_budget_items_updated_at before update on public.budget_items
  for each row execute function public.set_updated_at();
create trigger trg_guests_updated_at before update on public.guests
  for each row execute function public.set_updated_at();
create trigger trg_tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger trg_schedule_items_updated_at before update on public.schedule_items
  for each row execute function public.set_updated_at();
create trigger trg_website_content_updated_at before update on public.website_content
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Bij aanmaken van een wedding: de maker wordt owner + seed rechten-matrix.
-- Draait als definer zodat de platte insert vanuit de app blijft werken.
-- =====================================================================
create or replace function public.add_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(new.created_by, auth.uid());
begin
  if v_uid is not null then
    insert into public.wedding_members (wedding_id, user_id, role)
    values (new.id, v_uid, 'owner')
    on conflict do nothing;
  end if;

  -- Standaard rechten-matrix (admin kan deze later per bruiloft bijstellen).
  insert into public.wedding_role_permissions (wedding_id, role, module, level)
  values
    (new.id, 'planner', 'dashboard', 'view'),
    (new.id, 'planner', 'taken', 'edit'),
    (new.id, 'planner', 'draaiboek', 'edit'),
    (new.id, 'planner', 'tafels', 'edit'),
    (new.id, 'planner', 'gasten', 'view'),
    (new.id, 'planner', 'leveranciers', 'view'),
    (new.id, 'planner', 'budget', 'none'),
    (new.id, 'planner', 'website', 'none'),
    (new.id, 'planner', 'beheer', 'none'),
    (new.id, 'helper', 'dashboard', 'view'),
    (new.id, 'helper', 'taken', 'edit'),
    (new.id, 'helper', 'draaiboek', 'view'),
    (new.id, 'helper', 'tafels', 'none'),
    (new.id, 'helper', 'gasten', 'none'),
    (new.id, 'helper', 'leveranciers', 'none'),
    (new.id, 'helper', 'budget', 'none'),
    (new.id, 'helper', 'website', 'none'),
    (new.id, 'helper', 'beheer', 'none'),
    (new.id, 'viewer', 'dashboard', 'view'),
    (new.id, 'viewer', 'taken', 'view'),
    (new.id, 'viewer', 'draaiboek', 'view'),
    (new.id, 'viewer', 'tafels', 'view'),
    (new.id, 'viewer', 'gasten', 'none'),
    (new.id, 'viewer', 'leveranciers', 'none'),
    (new.id, 'viewer', 'budget', 'none'),
    (new.id, 'viewer', 'website', 'none'),
    (new.id, 'viewer', 'beheer', 'none')
  on conflict do nothing;

  return new;
end;
$$;

create trigger trg_add_creator_as_owner
  after insert on public.weddings
  for each row execute function public.add_creator_as_owner();

-- =====================================================================
-- Een wedding mag nooit zonder owner achterblijven.
-- =====================================================================
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other_owners integer;
begin
  -- Wordt de bruiloft zelf verwijderd (cascade)? Dan is deze guard niet van
  -- toepassing: het lidmaatschap mag mee verdwijnen.
  if tg_op = 'DELETE' and not exists (select 1 from public.weddings where id = old.wedding_id) then
    return old;
  end if;
  if tg_op = 'UPDATE' and not (old.role = 'owner' and new.role <> 'owner') then
    return new;
  end if;
  if tg_op = 'DELETE' and old.role <> 'owner' then
    return old;
  end if;

  select count(*) into v_other_owners
  from public.wedding_members
  where wedding_id = old.wedding_id and role = 'owner' and user_id <> old.user_id;

  if v_other_owners = 0 then
    raise exception 'Een bruiloft moet minstens één owner houden.';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger trg_prevent_last_owner_removal
  before update or delete on public.wedding_members
  for each row execute function public.prevent_last_owner_removal();

-- =====================================================================
-- Kruis-tenant-guard: een gekoppelde rij (tafel/leverancier/budgetregel)
-- moet bij DEZELFDE wedding horen. RLS dekt dit niet automatisch.
-- =====================================================================
create or replace function public.guests_check_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tafel_id is not null and not exists (
    select 1 from public.tables t where t.id = new.tafel_id and t.wedding_id = new.wedding_id
  ) then
    raise exception 'tafel_id hoort niet bij deze wedding';
  end if;
  return new;
end;
$$;
create trigger trg_guests_check_refs before insert or update on public.guests
  for each row execute function public.guests_check_refs();

create or replace function public.tasks_check_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vendor_id is not null and not exists (
    select 1 from public.vendors v where v.id = new.vendor_id and v.wedding_id = new.wedding_id
  ) then
    raise exception 'vendor_id hoort niet bij deze wedding';
  end if;
  if new.budget_item_id is not null and not exists (
    select 1 from public.budget_items b where b.id = new.budget_item_id and b.wedding_id = new.wedding_id
  ) then
    raise exception 'budget_item_id hoort niet bij deze wedding';
  end if;
  return new;
end;
$$;
create trigger trg_tasks_check_refs before insert or update on public.tasks
  for each row execute function public.tasks_check_refs();

create or replace function public.vendors_check_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.budget_item_id is not null and not exists (
    select 1 from public.budget_items b where b.id = new.budget_item_id and b.wedding_id = new.wedding_id
  ) then
    raise exception 'budget_item_id hoort niet bij deze wedding';
  end if;
  return new;
end;
$$;
create trigger trg_vendors_check_refs before insert or update on public.vendors
  for each row execute function public.vendors_check_refs();

create or replace function public.budget_items_check_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vendor_id is not null and not exists (
    select 1 from public.vendors v where v.id = new.vendor_id and v.wedding_id = new.wedding_id
  ) then
    raise exception 'vendor_id hoort niet bij deze wedding';
  end if;
  return new;
end;
$$;
create trigger trg_budget_items_check_refs before insert or update on public.budget_items
  for each row execute function public.budget_items_check_refs();

-- ============================================================
-- supabase/migrations/0004_rls.sql
-- ============================================================

-- =====================================================================
-- Rechten-helpers (SECURITY DEFINER -> bypassen RLS, voorkomt recursie als
-- policies wedding_members raadplegen). STABLE: cachebaar binnen een query.
-- =====================================================================
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and app_role = 'platform_admin'
  );
$$;

create or replace function public.is_wedding_member(p_wedding uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding and user_id = auth.uid()
  );
$$;

create or replace function public.member_role(p_wedding uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.wedding_members
  where wedding_id = p_wedding and user_id = auth.uid();
$$;

-- Het effectieve niveau (none/view/edit) van de huidige gebruiker voor een module.
create or replace function public.module_level(p_wedding uuid, p_module text)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.member_role(p_wedding) = 'owner' then 'edit'
    when public.member_role(p_wedding) is null then 'none'
    else coalesce(
      (select level from public.wedding_role_permissions
        where wedding_id = p_wedding
          and role = public.member_role(p_wedding)
          and module = p_module),
      'none')
  end;
$$;

create or replace function public.can_view(p_wedding uuid, p_module text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
      or public.module_level(p_wedding, p_module) in ('view', 'edit');
$$;

create or replace function public.can_edit(p_wedding uuid, p_module text)
returns boolean language sql stable security definer set search_path = public as $$
  -- platform_admin is bewust read-only (support), niet schrijvend.
  select public.module_level(p_wedding, p_module) = 'edit';
$$;

-- =====================================================================
-- RLS aanzetten op ELKE tabel.
-- =====================================================================
alter table public.profiles                 enable row level security;
alter table public.weddings                 enable row level security;
alter table public.wedding_members          enable row level security;
alter table public.wedding_role_permissions enable row level security;
alter table public.wedding_invites          enable row level security;
alter table public.tables                   enable row level security;
alter table public.vendors                  enable row level security;
alter table public.budget_items             enable row level security;
alter table public.guests                   enable row level security;
alter table public.tasks                    enable row level security;
alter table public.schedule_items           enable row level security;
alter table public.website_content          enable row level security;

-- --- profiles -------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- --- weddings -------------------------------------------------------
-- created_by staat de maker toe de net-aangemaakte rij te lezen: bij
-- INSERT ... RETURNING is het owner-lidmaatschap (door de AFTER-trigger) nog
-- niet zichtbaar, dus zonder created_by zou createWedding's RETURNING falen.
create policy weddings_select on public.weddings for select to authenticated
  using (created_by = auth.uid() or public.is_wedding_member(id) or public.is_platform_admin());
create policy weddings_insert on public.weddings for insert to authenticated
  with check (auth.uid() is not null);
create policy weddings_update on public.weddings for update to authenticated
  using (public.can_edit(id, 'beheer')) with check (public.can_edit(id, 'beheer'));
create policy weddings_delete on public.weddings for delete to authenticated
  using (public.member_role(id) = 'owner');

-- --- wedding_members (owner beheert leden) --------------------------
create policy members_select on public.wedding_members for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy members_insert on public.wedding_members for insert to authenticated
  with check (public.member_role(wedding_id) = 'owner');
create policy members_update on public.wedding_members for update to authenticated
  using (public.member_role(wedding_id) = 'owner')
  with check (public.member_role(wedding_id) = 'owner');
create policy members_delete on public.wedding_members for delete to authenticated
  using (public.member_role(wedding_id) = 'owner');

-- --- wedding_role_permissions (owner stelt de matrix in) ------------
create policy wrp_select on public.wedding_role_permissions for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy wrp_insert on public.wedding_role_permissions for insert to authenticated
  with check (public.member_role(wedding_id) = 'owner');
create policy wrp_update on public.wedding_role_permissions for update to authenticated
  using (public.member_role(wedding_id) = 'owner')
  with check (public.member_role(wedding_id) = 'owner');
create policy wrp_delete on public.wedding_role_permissions for delete to authenticated
  using (public.member_role(wedding_id) = 'owner');

-- --- wedding_invites (e-mails -> alleen owner ziet ze) -------------
create policy invites_select on public.wedding_invites for select to authenticated
  using (public.member_role(wedding_id) = 'owner' or public.is_platform_admin());
create policy invites_insert on public.wedding_invites for insert to authenticated
  with check (public.member_role(wedding_id) = 'owner');
create policy invites_update on public.wedding_invites for update to authenticated
  using (public.member_role(wedding_id) = 'owner')
  with check (public.member_role(wedding_id) = 'owner');
create policy invites_delete on public.wedding_invites for delete to authenticated
  using (public.member_role(wedding_id) = 'owner');

-- =====================================================================
-- Entiteittabellen: elke tabel mapt op zijn module in de rechten-matrix.
-- select = can_view, mutaties = can_edit (with check blokkeert wedding_id verzetten).
-- =====================================================================
-- tables -> 'tafels'
create policy tables_select on public.tables for select to authenticated
  using (public.can_view(wedding_id, 'tafels'));
create policy tables_insert on public.tables for insert to authenticated
  with check (public.can_edit(wedding_id, 'tafels'));
create policy tables_update on public.tables for update to authenticated
  using (public.can_edit(wedding_id, 'tafels')) with check (public.can_edit(wedding_id, 'tafels'));
create policy tables_delete on public.tables for delete to authenticated
  using (public.can_edit(wedding_id, 'tafels'));

-- vendors -> 'leveranciers'
create policy vendors_select on public.vendors for select to authenticated
  using (public.can_view(wedding_id, 'leveranciers'));
create policy vendors_insert on public.vendors for insert to authenticated
  with check (public.can_edit(wedding_id, 'leveranciers'));
create policy vendors_update on public.vendors for update to authenticated
  using (public.can_edit(wedding_id, 'leveranciers')) with check (public.can_edit(wedding_id, 'leveranciers'));
create policy vendors_delete on public.vendors for delete to authenticated
  using (public.can_edit(wedding_id, 'leveranciers'));

-- budget_items -> 'budget'
create policy budget_select on public.budget_items for select to authenticated
  using (public.can_view(wedding_id, 'budget'));
create policy budget_insert on public.budget_items for insert to authenticated
  with check (public.can_edit(wedding_id, 'budget'));
create policy budget_update on public.budget_items for update to authenticated
  using (public.can_edit(wedding_id, 'budget')) with check (public.can_edit(wedding_id, 'budget'));
create policy budget_delete on public.budget_items for delete to authenticated
  using (public.can_edit(wedding_id, 'budget'));

-- guests -> 'gasten'
create policy guests_select on public.guests for select to authenticated
  using (public.can_view(wedding_id, 'gasten'));
create policy guests_insert on public.guests for insert to authenticated
  with check (public.can_edit(wedding_id, 'gasten'));
create policy guests_update on public.guests for update to authenticated
  using (public.can_edit(wedding_id, 'gasten')) with check (public.can_edit(wedding_id, 'gasten'));
create policy guests_delete on public.guests for delete to authenticated
  using (public.can_edit(wedding_id, 'gasten'));

-- tasks -> 'taken'
create policy tasks_select on public.tasks for select to authenticated
  using (public.can_view(wedding_id, 'taken'));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.can_edit(wedding_id, 'taken'));
create policy tasks_update on public.tasks for update to authenticated
  using (public.can_edit(wedding_id, 'taken')) with check (public.can_edit(wedding_id, 'taken'));
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.can_edit(wedding_id, 'taken'));

-- schedule_items -> 'draaiboek'
create policy schedule_select on public.schedule_items for select to authenticated
  using (public.can_view(wedding_id, 'draaiboek'));
create policy schedule_insert on public.schedule_items for insert to authenticated
  with check (public.can_edit(wedding_id, 'draaiboek'));
create policy schedule_update on public.schedule_items for update to authenticated
  using (public.can_edit(wedding_id, 'draaiboek')) with check (public.can_edit(wedding_id, 'draaiboek'));
create policy schedule_delete on public.schedule_items for delete to authenticated
  using (public.can_edit(wedding_id, 'draaiboek'));

-- website_content -> 'website'
create policy website_select on public.website_content for select to authenticated
  using (public.can_view(wedding_id, 'website'));
create policy website_insert on public.website_content for insert to authenticated
  with check (public.can_edit(wedding_id, 'website'));
create policy website_update on public.website_content for update to authenticated
  using (public.can_edit(wedding_id, 'website')) with check (public.can_edit(wedding_id, 'website'));
create policy website_delete on public.website_content for delete to authenticated
  using (public.can_edit(wedding_id, 'website'));

-- =====================================================================
-- Tabel-privileges: authenticated mag CRUD (RLS bepaalt de rijen);
-- anon krijgt GEEN directe tabeltoegang (publiek loopt via RPC, zie 0005).
-- =====================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- ============================================================
-- supabase/migrations/0005_rpc.sql
-- ============================================================

-- =====================================================================
-- SECURITY DEFINER RPC's. Dit is de ENIGE manier waarop publiek (anon)
-- of nog-niet-leden gecontroleerd bij data komen. Tabellen blijven dicht.
-- =====================================================================

-- Een uitnodiging accepteren: voegt de ingelogde gebruiker als lid toe.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.wedding_invites;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Niet ingelogd';
  end if;

  select * into v_invite from public.wedding_invites where token = p_token;
  if not found then
    raise exception 'Uitnodiging niet gevonden';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Uitnodiging is al gebruikt';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Uitnodiging is verlopen';
  end if;

  insert into public.wedding_members (wedding_id, user_id, role)
  values (v_invite.wedding_id, v_uid, v_invite.role)
  on conflict (wedding_id, user_id) do update set role = excluded.role;

  update public.wedding_invites set accepted_at = now() where id = v_invite.id;

  return v_invite.wedding_id;
end;
$$;

-- Publieke trouwwebsite: levert UITSLUITEND publieke velden + de eigen
-- RSVP-gegevens van DEZE gast. Nooit de gastenlijst/adressen/notities.
create or replace function public.get_public_wedding(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_guest public.guests;
  v_wedding public.weddings;
  v_content public.website_content;
begin
  select * into v_guest from public.guests
  where rsvp_token = p_token and rsvp_token_revoked = false;
  if not found then
    return null;
  end if;

  select * into v_wedding from public.weddings where id = v_guest.wedding_id;
  select * into v_content from public.website_content where wedding_id = v_guest.wedding_id;

  return jsonb_build_object(
    'wedding', jsonb_build_object(
      'partner1Naam', v_wedding.partner1_naam,
      'partner2Naam', v_wedding.partner2_naam,
      'trouwdatum', v_wedding.trouwdatum,
      'locatie', v_wedding.locatie
    ),
    'content', case when v_content.id is null then null else jsonb_build_object(
      'welkomsttekst', v_content.welkomsttekst,
      'dresscode', v_content.dresscode,
      'cadeaulijst', v_content.cadeaulijst,
      'hotels', v_content.hotels,
      'routebeschrijving', v_content.routebeschrijving,
      'contact', v_content.contact
    ) end,
    'schedule', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tijd', s.tijd, 'titel', s.titel,
        'omschrijving', s.omschrijving, 'locatie', s.locatie
      ) order by s.tijd)
      from public.schedule_items s
      where s.wedding_id = v_guest.wedding_id and s.betrokkenen ? 'gasten'
    ), '[]'::jsonb),
    'guest', jsonb_build_object(
      'voornaam', v_guest.voornaam,
      'achternaam', v_guest.achternaam,
      'rsvpStatus', v_guest.rsvp_status,
      'dieetwensen', v_guest.dieetwensen,
      'heeftPartner', v_guest.heeft_partner,
      'partnerNaam', v_guest.partner_naam,
      'aantalKinderen', v_guest.aantal_kinderen,
      'rsvpSubmittedAt', v_guest.rsvp_submitted_at
    )
  );
end;
$$;

-- Publieke RSVP-inzending: werkt UITSLUITEND gewhiteliste velden van DEZE
-- ene gast bij. Andere payload-keys worden genegeerd.
create or replace function public.submit_rsvp(p_token text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests;
  v_status text := p_payload ->> 'rsvpStatus';
begin
  select * into v_guest from public.guests
  where rsvp_token = p_token and rsvp_token_revoked = false;
  if not found then
    raise exception 'Ongeldige of ingetrokken uitnodiging';
  end if;

  if v_status is not null and v_status not in ('bevestigd', 'afgemeld') then
    raise exception 'Ongeldige RSVP-status';
  end if;

  update public.guests set
    rsvp_status = coalesce(v_status, rsvp_status),
    dieetwensen = coalesce(p_payload ->> 'dieetwensen', dieetwensen),
    heeft_partner = coalesce((p_payload ->> 'heeftPartner')::boolean, heeft_partner),
    partner_naam = coalesce(p_payload ->> 'partnerNaam', partner_naam),
    aantal_kinderen = coalesce((p_payload ->> 'aantalKinderen')::integer, aantal_kinderen),
    rsvp_submitted_at = now()
  where id = v_guest.id;
end;
$$;

-- Expliciete grants: niets staat standaard open voor anon.
revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

revoke all on function public.get_public_wedding(text) from public;
grant execute on function public.get_public_wedding(text) to anon, authenticated;

revoke all on function public.submit_rsvp(text, jsonb) from public;
grant execute on function public.submit_rsvp(text, jsonb) to anon, authenticated;

-- ============================================================
-- supabase/migrations/0006_member_admin.sql
-- ============================================================

-- Ledenlijst met naam/e-mail. Leden mogen elkaars basisprofiel niet direct
-- lezen (profiles-RLS), dus dit loopt via een definer-RPC die op lidmaatschap
-- van DEZE bruiloft controleert.
create or replace function public.list_wedding_members(p_wedding uuid)
returns table (user_id uuid, email text, display_name text, role text)
language sql
security definer
stable
set search_path = public
as $$
  select m.user_id, p.email, p.display_name, m.role
  from public.wedding_members m
  join public.profiles p on p.id = m.user_id
  where m.wedding_id = p_wedding
    and public.is_wedding_member(p_wedding)
  order by
    case m.role
      when 'owner' then 0
      when 'planner' then 1
      when 'helper' then 2
      else 3
    end,
    coalesce(p.display_name, p.email);
$$;

revoke all on function public.list_wedding_members(uuid) from public;
grant execute on function public.list_wedding_members(uuid) to authenticated;

-- ============================================================
-- supabase/migrations/0007_realtime.sql
-- ============================================================

-- =====================================================================
-- Realtime: live samenwerking binnen één bruiloft.
-- =====================================================================
-- replica identity full zorgt dat DELETE/UPDATE het volledige OUDE record
-- meesturen (incl. wedding_id). Nodig om realtime te filteren op wedding_id
-- én om de juiste rij uit de store te verwijderen bij een DELETE.
alter table public.weddings        replica identity full;
alter table public.guests          replica identity full;
alter table public.tasks           replica identity full;
alter table public.vendors         replica identity full;
alter table public.budget_items    replica identity full;
alter table public.schedule_items  replica identity full;
alter table public.tables          replica identity full;
alter table public.website_content replica identity full;

-- Voeg de tabellen toe aan de Supabase realtime-publicatie. RLS blijft gelden:
-- een ingelogde client ontvangt alleen wijzigingen op rijen die hij mag SELECTen.
alter publication supabase_realtime add table
  public.weddings,
  public.guests,
  public.tasks,
  public.vendors,
  public.budget_items,
  public.schedule_items,
  public.tables,
  public.website_content;
