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
create policy weddings_select on public.weddings for select to authenticated
  using (public.is_wedding_member(id) or public.is_platform_admin());
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
