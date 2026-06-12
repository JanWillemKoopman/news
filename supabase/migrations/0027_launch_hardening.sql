-- 0027_launch_hardening.sql
-- Beveiligings- en performance-hardening vóór livegang, op basis van de
-- Supabase security/performance advisors.
--
-- 1. list_wedding_members lekte ledendata: SECURITY DEFINER zonder interne
--    membership-check én uitvoerbaar door anon. Nu alleen voor leden van de
--    bruiloft (of platform-admin) en niet meer voor anon.
-- 2. Ontbrekende search_path op functies (search_path-hijacking).
-- 3. EXECUTE ingetrokken op functies die nooit via de API aangeroepen horen
--    te worden (triggerfuncties, rate-limit-functies voor service role).
-- 4. Storage-SELECT-policies aangescherpt: publieke buckets worden via de
--    publieke object-URL geserveerd (zonder RLS), dus de brede SELECT-policy
--    diende alleen om te kunnen *listen*. Listen kan nu alleen nog voor
--    eigen bestanden/bruiloften.
-- 5. Indexen op foreign keys zonder index.
-- 6. auth.uid() in RLS-policies vervangen door (select auth.uid()) zodat
--    Postgres het één keer per query evalueert i.p.v. per rij.

-- ---------------------------------------------------------------------------
-- 1) list_wedding_members: membership-check + search_path + geen anon
-- ---------------------------------------------------------------------------

create or replace function public.list_wedding_members(p_wedding uuid)
returns table(user_id uuid, email text, display_name text, role text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select
    wm.user_id,
    p.email,
    p.display_name,
    wm.role,
    p.avatar_url
  from wedding_members wm
  join profiles p on p.id = wm.user_id
  where wm.wedding_id = p_wedding
    and (public.is_wedding_member(p_wedding) or public.is_platform_admin());
$$;

revoke all on function public.list_wedding_members(uuid) from public, anon;
grant execute on function public.list_wedding_members(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Vaste search_path op resterende functies
-- ---------------------------------------------------------------------------

alter function public.set_updated_at() set search_path = public;
alter function public.suppliers_set_search_vector() set search_path = public;

-- ---------------------------------------------------------------------------
-- 3) EXECUTE intrekken op functies die niet via de API horen te lopen
-- ---------------------------------------------------------------------------

-- Triggerfuncties: worden door triggers uitgevoerd (als functie-eigenaar),
-- nooit door clients.
revoke all on function public.add_creator_as_owner()         from public, anon, authenticated;
revoke all on function public.budget_items_check_refs()      from public, anon, authenticated;
revoke all on function public.guests_check_refs()            from public, anon, authenticated;
revoke all on function public.handle_new_user()              from public, anon, authenticated;
revoke all on function public.log_activity()                 from public, anon, authenticated;
revoke all on function public.prevent_last_owner_removal()   from public, anon, authenticated;
revoke all on function public.set_updated_at()               from public, anon, authenticated;
revoke all on function public.suppliers_set_search_vector()  from public, anon, authenticated;
revoke all on function public.task_comments_prepare()        from public, anon, authenticated;
revoke all on function public.tasks_check_assignees()        from public, anon, authenticated;
revoke all on function public.tasks_check_refs()             from public, anon, authenticated;
revoke all on function public.vendors_check_refs()           from public, anon, authenticated;

-- Rate-limit-functies: alleen server-side via de service role.
revoke all on function public.increment_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.increment_rate_limit(text, integer, integer) to service_role;
revoke all on function public.ai_rate_limit_increment(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.ai_rate_limit_increment(uuid, text, integer) to service_role;

-- RPC's die alleen voor ingelogde gebruikers zijn: anon eraf.
revoke execute on function public.accept_invite(text)        from anon;
revoke execute on function public.check_slug_available(text) from anon;

-- RLS-hulpfuncties: alleen gebruikt in policies voor authenticated
-- (er bestaan geen anon-policies op public-tabellen).
revoke execute on function public.can_edit(uuid, text)       from anon;
revoke execute on function public.can_view(uuid, text)       from anon;
revoke execute on function public.is_platform_admin()        from anon;
revoke execute on function public.is_wedding_member(uuid)    from anon;
revoke execute on function public.member_role(uuid)          from anon;
revoke execute on function public.module_level(uuid, text)   from anon;

-- Publiek blijven (bewust, token-/slug-gebonden): get_public_website,
-- get_public_registry, get_public_wedding, submit_rsvp,
-- reserve_registry_item, cancel_reservation_by_token.

-- ---------------------------------------------------------------------------
-- 4) Storage: brede SELECT-policies vervangen door eigenaar-/lid-scoped
--    (bestanden blijven publiek bereikbaar via de public-bucket-URL)
-- ---------------------------------------------------------------------------

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and name like ((select auth.uid())::text || '.%')
  );

drop policy if exists "registry_images_public_read" on storage.objects;
create policy "registry_images_select_members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'registry-images'
    and (storage.foldername(name))[1] in (
      select w.id::text
      from public.weddings w
      join public.wedding_members m on m.wedding_id = w.id
      where m.user_id = (select auth.uid())
    )
  );

drop policy if exists "wedding_media_public_read" on storage.objects;
create policy "wedding_media_select_members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wedding-media'
    and (storage.foldername(name))[1] in (
      select w.id::text
      from public.weddings w
      join public.wedding_members m on m.wedding_id = w.id
      where m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 5) Indexen op foreign keys zonder index
-- ---------------------------------------------------------------------------

create index if not exists idx_budget_items_vendor_id          on public.budget_items (vendor_id);
create index if not exists idx_guests_tafel_id                 on public.guests (tafel_id);
create index if not exists idx_registry_contributions_item_id  on public.registry_contributions (item_id);
create index if not exists idx_registry_items_wedding_id       on public.registry_items (wedding_id);
create index if not exists idx_task_comments_author_id         on public.task_comments (author_id);
create index if not exists idx_tasks_budget_item_id            on public.tasks (budget_item_id);
create index if not exists idx_tasks_vendor_id                 on public.tasks (vendor_id);
create index if not exists idx_vendors_budget_item_id          on public.vendors (budget_item_id);
create index if not exists idx_wedding_activity_actor_id       on public.wedding_activity (actor_id);
create index if not exists idx_wedding_invites_created_by      on public.wedding_invites (created_by);
create index if not exists idx_weddings_created_by             on public.weddings (created_by);

-- ---------------------------------------------------------------------------
-- 6) auth.uid() één keer per query evalueren in RLS-policies
-- ---------------------------------------------------------------------------

alter policy profiles_select on public.profiles
  using ((id = (select auth.uid())) or is_platform_admin());

alter policy profiles_update on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy weddings_select on public.weddings
  using ((created_by = (select auth.uid())) or is_wedding_member(id) or is_platform_admin());

alter policy weddings_insert on public.weddings
  with check ((select auth.uid()) is not null);

alter policy comments_delete on public.task_comments
  using ((author_id = (select auth.uid())) or (member_role(wedding_id) = 'owner'));
