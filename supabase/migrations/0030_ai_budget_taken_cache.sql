-- Cache voor AI-budgetanalyse en AI-taaksuggesties.
-- Zelfde patroon als ai_advice_cache: fingerprint-gebaseerde invalidatie.

create table public.ai_budget_cache (
  wedding_id        uuid        primary key
                                references public.weddings(id)
                                on delete cascade,
  cached_advies     jsonb       not null default '{}',
  data_fingerprint  text        not null default '',
  last_updated_at   timestamptz not null default now()
);

alter table public.ai_budget_cache enable row level security;

create policy ai_budget_cache_select on public.ai_budget_cache
  for select to authenticated using (public.is_wedding_member(wedding_id));
create policy ai_budget_cache_insert on public.ai_budget_cache
  for insert to authenticated with check (public.is_wedding_member(wedding_id));
create policy ai_budget_cache_update on public.ai_budget_cache
  for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

grant select, insert, update on public.ai_budget_cache to authenticated;


create table public.ai_taken_cache (
  wedding_id        uuid        primary key
                                references public.weddings(id)
                                on delete cascade,
  cached_advies     jsonb       not null default '{}',
  data_fingerprint  text        not null default '',
  last_updated_at   timestamptz not null default now()
);

alter table public.ai_taken_cache enable row level security;

create policy ai_taken_cache_select on public.ai_taken_cache
  for select to authenticated using (public.is_wedding_member(wedding_id));
create policy ai_taken_cache_insert on public.ai_taken_cache
  for insert to authenticated with check (public.is_wedding_member(wedding_id));
create policy ai_taken_cache_update on public.ai_taken_cache
  for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

grant select, insert, update on public.ai_taken_cache to authenticated;
