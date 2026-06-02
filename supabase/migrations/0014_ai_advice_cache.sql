-- AI Advice cache: slaat per bruiloft het laatste dashboard-advies op.
-- Invalidatie op basis van een data-vingerafdruk (fingerprint), niet op basis
-- van tijd. Een nieuwe AI-call wordt alleen gedaan als de planningsdata
-- is veranderd én de cooldown (1 uur) is verstreken.

create table public.ai_advice_cache (
  wedding_id        uuid        primary key
                                references public.weddings(id)
                                on delete cascade,
  cached_advies     jsonb       not null default '[]',
  data_fingerprint  text        not null default '',
  last_updated_at   timestamptz not null default now()
);

alter table public.ai_advice_cache enable row level security;

create policy ai_advice_cache_select
  on public.ai_advice_cache
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy ai_advice_cache_insert
  on public.ai_advice_cache
  for insert to authenticated
  with check (public.is_wedding_member(wedding_id));

create policy ai_advice_cache_update
  on public.ai_advice_cache
  for update to authenticated
  using  (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

grant select, insert, update
  on public.ai_advice_cache
  to authenticated;
