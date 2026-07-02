-- =====================================================================
-- Brontabel volledig afschermen: alleen de service-role kan er nog bij.
--
-- Dubbel slot: RLS-zonder-policies blokkeert zelfs als er ooit weer een
-- grant bijkomt, en de ingetrokken grants blokkeren zelfs als RLS ooit
-- uit zou gaan. Bewust GEEN `force row level security`: de sync-functie
-- (security definer, owner) en de service-role moeten blijven werken.
--
-- De tabel bestaat alleen in de live database, daarom to_regclass-gegate.
-- Ook uit de realtime-publicatie halen (tweede leesroute buiten REST om).
-- =====================================================================

do $$
declare
  p record;
begin
  if to_regclass('public.tpw_businesses') is not null then
    execute 'alter table public.tpw_businesses enable row level security';

    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = 'tpw_businesses'
    loop
      execute format('drop policy %I on public.tpw_businesses', p.policyname);
    end loop;

    execute 'revoke all on table public.tpw_businesses from public, anon, authenticated';

    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'tpw_businesses'
    ) then
      execute 'alter publication supabase_realtime drop table public.tpw_businesses';
    end if;
  end if;
end $$;
