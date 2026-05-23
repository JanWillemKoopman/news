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
