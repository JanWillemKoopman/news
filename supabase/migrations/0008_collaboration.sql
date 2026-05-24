-- =====================================================================
-- Samen plannen: activiteitenfeed + opmerkingen op taken.
-- Bouwt voort op de rechten-helpers (0004) en realtime (0007).
-- =====================================================================

-- --- wedding_activity (de feed; alleen door de trigger geschreven) ----
-- module mapt op de rechten-matrix, zodat de feed exact de per-rol zichtbaarheid
-- van de onderliggende tabellen overneemt (geen budget-lek naar een helper).
create table public.wedding_activity (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  module text not null,         -- taken, gasten, leveranciers, budget, draaiboek, tafels
  entity_type text not null,    -- brontabel: tasks, guests, vendors, ...
  entity_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default '',  -- snapshot: profiles is per-gebruiker afgeschermd
  label text not null default '',       -- best-effort titel/naam van de rij
  created_at timestamptz not null default now()
);
create index idx_wedding_activity_wedding
  on public.wedding_activity(wedding_id, created_at desc);

alter table public.wedding_activity enable row level security;

-- Lezen = mag je de bijbehorende module zien? Geen write-policies: alleen de
-- SECURITY DEFINER-trigger hieronder schrijft (clients kunnen niet inserten).
create policy activity_select on public.wedding_activity for select to authenticated
  using (public.can_view(wedding_id, module) or public.is_platform_admin());

-- --- log-trigger: vult de feed bij elke mutatie op de module-tabellen ---
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_wedding uuid := (v_rec->>'wedding_id')::uuid;
  v_actor uuid := auth.uid();
  v_name text := '';
begin
  -- Bij het verwijderen van een hele bruiloft cascaden de kindrijen; die niet
  -- loggen (de bruiloft én deze feed verdwijnen toch mee, en een insert die naar
  -- de net-verwijderde bruiloft verwijst zou de FK schenden).
  if not exists (select 1 from public.weddings w where w.id = v_wedding) then
    return null;
  end if;

  select coalesce(nullif(p.display_name, ''), p.email, '')
    into v_name
  from public.profiles p
  where p.id = v_actor;

  insert into public.wedding_activity
    (wedding_id, module, entity_type, entity_id, action, actor_id, actor_name, label)
  values (
    v_wedding,
    case tg_table_name
      when 'tasks' then 'taken'
      when 'guests' then 'gasten'
      when 'vendors' then 'leveranciers'
      when 'budget_items' then 'budget'
      when 'schedule_items' then 'draaiboek'
      when 'tables' then 'tafels'
      else tg_table_name
    end,
    tg_table_name,
    nullif(v_rec->>'id', '')::uuid,
    lower(tg_op),
    v_actor,
    coalesce(v_name, ''),
    coalesce(
      nullif(v_rec->>'titel', ''),
      nullif(v_rec->>'naam', ''),
      nullif(btrim(coalesce(v_rec->>'voornaam', '') || ' ' || coalesce(v_rec->>'achternaam', '')), ''),
      nullif(v_rec->>'omschrijving', ''),
      ''
    )
  );
  return null; -- AFTER-trigger: retourwaarde wordt genegeerd
end;
$$;

create trigger trg_log_activity_tasks
  after insert or update or delete on public.tasks
  for each row execute function public.log_activity();
create trigger trg_log_activity_guests
  after insert or update or delete on public.guests
  for each row execute function public.log_activity();
create trigger trg_log_activity_vendors
  after insert or update or delete on public.vendors
  for each row execute function public.log_activity();
create trigger trg_log_activity_budget_items
  after insert or update or delete on public.budget_items
  for each row execute function public.log_activity();
create trigger trg_log_activity_schedule_items
  after insert or update or delete on public.schedule_items
  for each row execute function public.log_activity();
create trigger trg_log_activity_tables
  after insert or update or delete on public.tables
  for each row execute function public.log_activity();

-- --- task_comments (opmerkingen op een taak) --------------------------
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',  -- snapshot, zelfde reden als hierboven
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_task_comments_task on public.task_comments(task_id, created_at);
create index idx_task_comments_wedding on public.task_comments(wedding_id);

alter table public.task_comments enable row level security;

-- Lezen bij can_view('taken'); plaatsen bij can_edit('taken'); verwijderen mag
-- de auteur zelf of de owner. Geen update in v1.
create policy comments_select on public.task_comments for select to authenticated
  using (public.can_view(wedding_id, 'taken'));
create policy comments_insert on public.task_comments for insert to authenticated
  with check (public.can_edit(wedding_id, 'taken'));
create policy comments_delete on public.task_comments for delete to authenticated
  using (author_id = auth.uid() or public.member_role(wedding_id) = 'owner');

-- Server-autoritatief: auteur + naam invullen en de taak-tenant valideren.
create or replace function public.task_comments_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := '';
begin
  new.author_id := auth.uid();
  select coalesce(nullif(p.display_name, ''), p.email, '')
    into v_name
  from public.profiles p
  where p.id = new.author_id;
  new.author_name := coalesce(v_name, '');

  if not exists (
    select 1 from public.tasks t
    where t.id = new.task_id and t.wedding_id = new.wedding_id
  ) then
    raise exception 'task_id hoort niet bij deze wedding';
  end if;

  return new;
end;
$$;

create trigger trg_task_comments_prepare before insert on public.task_comments
  for each row execute function public.task_comments_prepare();

-- =====================================================================
-- Tabel-privileges (grants gelden niet automatisch voor nieuwe tabellen).
-- wedding_activity: alleen lezen (de trigger schrijft als definer).
-- =====================================================================
grant select on public.wedding_activity to authenticated;
grant select, insert, delete on public.task_comments to authenticated;
revoke all on public.wedding_activity from anon;
revoke all on public.task_comments from anon;

-- =====================================================================
-- Realtime: beide tabellen live binnen de bruiloft (RLS blijft gelden).
-- =====================================================================
alter table public.wedding_activity replica identity full;
alter table public.task_comments    replica identity full;
alter publication supabase_realtime add table
  public.wedding_activity,
  public.task_comments;
