-- AI Wedding Planner cache: slaat per bruiloft het laatste AI-advies op,
-- inclusief tijdstip van aanmaak (gebruikt voor rate-limiting van 10 min).

create table public.ai_wedding_planner_cache (
  wedding_id      uuid        primary key
                              references public.weddings(id)
                              on delete cascade,
  cached_advice   jsonb       not null default '{}',
  last_updated_at timestamptz not null default now()
);

alter table public.ai_wedding_planner_cache enable row level security;

create policy ai_planner_cache_select
  on public.ai_wedding_planner_cache
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy ai_planner_cache_insert
  on public.ai_wedding_planner_cache
  for insert to authenticated
  with check (public.is_wedding_member(wedding_id));

create policy ai_planner_cache_update
  on public.ai_wedding_planner_cache
  for update to authenticated
  using  (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

grant select, insert, update
  on public.ai_wedding_planner_cache
  to authenticated;
