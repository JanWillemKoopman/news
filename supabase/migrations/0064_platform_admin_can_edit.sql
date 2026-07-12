-- =====================================================================
-- Wijziging (audit 2026-07-11): platform_admin mag bewerken.
--
-- Oorspronkelijk (0004_rls.sql) was can_edit bewust read-only voor
-- platform-admins ("support, niet schrijvend"): can_view bevatte wél
-- is_platform_admin(), can_edit niet. De client-store gaf een admin echter
-- ALL_EDIT_PERMISSIONS, waardoor de UI bewerkknoppen toonde die de database
-- vervolgens weigerde (schrijfacties faalden met een RLS-fout).
--
-- Bewuste keuze: support mag ook echt ingrijpen. Daarom krijgt can_edit
-- dezelfde platform_admin-uitzondering als can_view. Dit is de enige
-- chokepoint — alle entiteit-policies (tasks/guests/vendors/budget_items/
-- schedule_items/tables/website_content, messages-insert, registry,
-- task_comments-insert en weddings-update via 'beheer') gaan via can_edit,
-- dus ze erven deze wijziging automatisch.
--
-- BEWUST ONVERANDERD: de eigenaar-exclusieve acties gaan NIET via can_edit
-- maar via member_role(...) = 'owner' (leden uitnodigen/wijzigen/verwijderen,
-- de rechten-matrix instellen, de bruiloft verwijderen). Die blijven dus
-- voorbehouden aan echte owners; een platform_admin kan wél de inhoud
-- bewerken, maar niet het eigenaarschap/de ledenstructuur omgooien.
-- =====================================================================

create or replace function public.can_edit(p_wedding uuid, p_module text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
      or public.module_level(p_wedding, p_module) = 'edit';
$$;

-- can_edit blijft dicht voor anon (zie 0027_launch_hardening.sql). CREATE OR
-- REPLACE behoudt bestaande grants, maar we herhalen de revoke idempotent
-- zodat de intentie in deze migratie zichtbaar blijft.
revoke execute on function public.can_edit(uuid, text) from anon;
