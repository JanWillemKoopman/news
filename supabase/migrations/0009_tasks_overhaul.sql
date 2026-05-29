-- Taken-tab overhaul: multi-assignee, subtaken, drag-volgorde.
-- Additieve wijziging: bestaande kolom `toegewezen_aan` blijft als legacy-fallback
-- staan tot de UI volledig op `assignees` is overgegaan.

-- 1. Assignees: lijst van wedding-member user_ids. Lege array = nog niet toegewezen.
alter table public.tasks
  add column if not exists assignees uuid[] not null default '{}';

-- GIN-index om snel taken voor een specifieke user te vinden ("mijn taken").
create index if not exists idx_tasks_assignees on public.tasks using gin(assignees);

-- 2. Subtaken: jsonb-array van { id, titel, klaar }. Zelfde patroon als
-- budget_items.betaaltermijnen / schedule_items.betrokkenen.
alter table public.tasks
  add column if not exists subtaken jsonb not null default '[]'::jsonb;

-- 3. Volgorde: optionele integer voor handmatige drag-sortering binnen tijdsblok.
alter table public.tasks
  add column if not exists volgorde integer;

-- 4. Integriteit: elke user_id in `assignees` moet lid zijn van deze bruiloft.
create or replace function public.tasks_check_assignees()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignees is not null and array_length(new.assignees, 1) > 0 then
    if exists (
      select 1
      from unnest(new.assignees) as a(user_id)
      where not exists (
        select 1
        from public.wedding_members m
        where m.wedding_id = new.wedding_id
          and m.user_id = a.user_id
      )
    ) then
      raise exception 'assignees bevat een gebruiker die geen lid is van deze bruiloft';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_check_assignees on public.tasks;
create trigger trg_tasks_check_assignees
  before insert or update on public.tasks
  for each row execute function public.tasks_check_assignees();
