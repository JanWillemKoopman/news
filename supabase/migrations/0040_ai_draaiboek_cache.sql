-- Cache voor AI-draaiboeksuggesties (#29). Zelfde patroon als ai_taken_cache:
-- fingerprint-gebaseerde invalidatie, lid-gebonden RLS.

create table if not exists public.ai_draaiboek_cache (
  wedding_id        uuid        primary key
                                references public.weddings(id)
                                on delete cascade,
  cached_advies     jsonb       not null default '{}',
  data_fingerprint  text        not null default '',
  last_updated_at   timestamptz not null default now()
);

alter table public.ai_draaiboek_cache enable row level security;

create policy ai_draaiboek_cache_select on public.ai_draaiboek_cache
  for select to authenticated using (public.is_wedding_member(wedding_id));
create policy ai_draaiboek_cache_insert on public.ai_draaiboek_cache
  for insert to authenticated with check (public.is_wedding_member(wedding_id));
create policy ai_draaiboek_cache_update on public.ai_draaiboek_cache
  for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

grant select, insert, update on public.ai_draaiboek_cache to authenticated;
