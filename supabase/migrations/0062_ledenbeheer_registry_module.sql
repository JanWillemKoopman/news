-- =====================================================================
-- Ledenbeheer-upgrade: de cadeaulijst ('registry') ontbrak in de
-- rechten-matrix, waardoor die module niet per rol instelbaar was.
-- 1) Check-constraint uitbreiden met 'registry'.
-- 2) Seed-functie bijwerken zodat nieuwe bruiloften registry-rechten krijgen.
-- 3) Backfill voor bestaande bruiloften (zelfde defaults als de seed).
-- =====================================================================

alter table public.wedding_role_permissions
  drop constraint if exists wedding_role_permissions_module_check;
alter table public.wedding_role_permissions
  add constraint wedding_role_permissions_module_check
  check (module in (
    'dashboard', 'taken', 'budget', 'leveranciers', 'gasten',
    'website', 'draaiboek', 'tafels', 'registry', 'beheer'
  ));

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
    (new.id, 'planner', 'registry', 'view'),
    (new.id, 'planner', 'beheer', 'none'),
    (new.id, 'helper', 'dashboard', 'view'),
    (new.id, 'helper', 'taken', 'edit'),
    (new.id, 'helper', 'draaiboek', 'view'),
    (new.id, 'helper', 'tafels', 'none'),
    (new.id, 'helper', 'gasten', 'none'),
    (new.id, 'helper', 'leveranciers', 'none'),
    (new.id, 'helper', 'budget', 'none'),
    (new.id, 'helper', 'website', 'none'),
    (new.id, 'helper', 'registry', 'none'),
    (new.id, 'helper', 'beheer', 'none'),
    (new.id, 'viewer', 'dashboard', 'view'),
    (new.id, 'viewer', 'taken', 'view'),
    (new.id, 'viewer', 'draaiboek', 'view'),
    (new.id, 'viewer', 'tafels', 'view'),
    (new.id, 'viewer', 'gasten', 'none'),
    (new.id, 'viewer', 'leveranciers', 'none'),
    (new.id, 'viewer', 'budget', 'none'),
    (new.id, 'viewer', 'website', 'none'),
    (new.id, 'viewer', 'registry', 'none'),
    (new.id, 'viewer', 'beheer', 'none')
  on conflict do nothing;

  return new;
end;
$$;

-- Backfill: bestaande bruiloften krijgen dezelfde registry-defaults.
insert into public.wedding_role_permissions (wedding_id, role, module, level)
select w.id, r.role, 'registry', r.level
from public.weddings w
cross join (values ('planner', 'view'), ('helper', 'none'), ('viewer', 'none')) as r(role, level)
on conflict do nothing;
