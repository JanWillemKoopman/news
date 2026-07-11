-- =====================================================================
-- Wijziging (audit 2026-07-11): platform_admin krijgt volledige toegang.
--
-- 0064 gaf de platform_admin al edit-rechten op de INHOUD (via can_edit).
-- De eigenaar-exclusieve acties liepen echter nog via member_role(...) =
-- 'owner' en bleven daardoor dicht: leden uitnodigen/wijzigen/verwijderen,
-- de rechten-matrix instellen en de bruiloft verwijderen.
--
-- Bewuste keuze: de platform_admin (ontwikkelaar/operator) mag alles wat een
-- owner mag, op elke bruiloft. We introduceren één helper can_manage_wedding()
-- en trekken alle owner-exclusieve policies daar doorheen, zodat de
-- admin-uitzondering op één plek staat.
--
-- Onaangeroerd blijft de trigger prevent_last_owner_removal(): een bruiloft
-- moet minstens één owner houden. Dat is een data-integriteitsgrens, geen
-- autorisatiegrens, en blijft dus voor iedereen gelden.
-- =====================================================================

create or replace function public.can_manage_wedding(p_wedding uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.member_role(p_wedding) = 'owner' or public.is_platform_admin();
$$;

revoke execute on function public.can_manage_wedding(uuid) from anon;
grant execute on function public.can_manage_wedding(uuid) to authenticated;

-- --- weddings: verwijderen -------------------------------------------
drop policy if exists weddings_delete on public.weddings;
create policy weddings_delete on public.weddings for delete to authenticated
  using (public.can_manage_wedding(id));

-- --- wedding_members: ledenbeheer -----------------------------------
drop policy if exists members_insert on public.wedding_members;
create policy members_insert on public.wedding_members for insert to authenticated
  with check (public.can_manage_wedding(wedding_id));
drop policy if exists members_update on public.wedding_members;
create policy members_update on public.wedding_members for update to authenticated
  using (public.can_manage_wedding(wedding_id))
  with check (public.can_manage_wedding(wedding_id));
drop policy if exists members_delete on public.wedding_members;
create policy members_delete on public.wedding_members for delete to authenticated
  using (public.can_manage_wedding(wedding_id));

-- --- wedding_role_permissions: rechten-matrix -----------------------
drop policy if exists wrp_insert on public.wedding_role_permissions;
create policy wrp_insert on public.wedding_role_permissions for insert to authenticated
  with check (public.can_manage_wedding(wedding_id));
drop policy if exists wrp_update on public.wedding_role_permissions;
create policy wrp_update on public.wedding_role_permissions for update to authenticated
  using (public.can_manage_wedding(wedding_id))
  with check (public.can_manage_wedding(wedding_id));
drop policy if exists wrp_delete on public.wedding_role_permissions;
create policy wrp_delete on public.wedding_role_permissions for delete to authenticated
  using (public.can_manage_wedding(wedding_id));

-- --- wedding_invites: uitnodigingen ---------------------------------
drop policy if exists invites_insert on public.wedding_invites;
create policy invites_insert on public.wedding_invites for insert to authenticated
  with check (public.can_manage_wedding(wedding_id));
drop policy if exists invites_update on public.wedding_invites;
create policy invites_update on public.wedding_invites for update to authenticated
  using (public.can_manage_wedding(wedding_id))
  with check (public.can_manage_wedding(wedding_id));
drop policy if exists invites_delete on public.wedding_invites;
create policy invites_delete on public.wedding_invites for delete to authenticated
  using (public.can_manage_wedding(wedding_id));

-- invites_select had de admin-uitzondering al; nu gelijkgetrokken op de helper
-- (owner ziet z'n eigen uitnodigingen, platform_admin die van iedereen).
drop policy if exists invites_select on public.wedding_invites;
create policy invites_select on public.wedding_invites for select to authenticated
  using (public.can_manage_wedding(wedding_id));

-- --- task_comments: verwijderen -------------------------------------
-- De auteur mag z'n eigen opmerking altijd verwijderen; daarnaast de owner
-- én (nieuw) de platform_admin.
drop policy if exists comments_delete on public.task_comments;
create policy comments_delete on public.task_comments for delete to authenticated
  using (author_id = auth.uid() or public.can_manage_wedding(wedding_id));
