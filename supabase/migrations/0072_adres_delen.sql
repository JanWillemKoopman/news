-- =====================================================================
-- adres_shares: adressen verzamelen via een publieke deel-link. Het
-- bruidspaar deelt één link (WhatsApp/e-mail); genodigden geven daar hun
-- adres (en optioneel e-mail/telefoon) door, dat op de gastenlijst landt —
-- gematcht op naam of als nieuwe gast. Zelfde aan/uit-model als
-- draaiboek_shares/agenda_shares: rij bestaat = link actief.
-- Rechten volgen de gasten-module (net als guests zelf).
-- =====================================================================

create table public.adres_shares (
  wedding_id uuid primary key references public.weddings(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.adres_shares enable row level security;

create policy adres_shares_select on public.adres_shares
  for select to authenticated
  using (public.is_wedding_member(wedding_id) or public.is_platform_admin());
create policy adres_shares_insert on public.adres_shares
  for insert to authenticated
  with check (public.can_edit(wedding_id, 'gasten'));
create policy adres_shares_delete on public.adres_shares
  for delete to authenticated
  using (public.can_edit(wedding_id, 'gasten'));

grant select, insert, delete on public.adres_shares to authenticated;
revoke all on public.adres_shares from anon;

create or replace function public.adres_shares_prepare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger trg_adres_shares_prepare before insert on public.adres_shares
  for each row execute function public.adres_shares_prepare();

alter table public.adres_shares replica identity full;
alter publication supabase_realtime add table public.adres_shares;

-- =====================================================================
-- get_adres_share_meta: de publieke adres-pagina (/adres/[token]) toont
-- alleen voor wíe je je adres doorgeeft — de partnernamen, meer niet.
-- Het indienen zelf loopt via /api/adres (service-role + rate limit),
-- niet via een RPC: de match-op-naam-logica leeft in TypeScript.
-- =====================================================================

create or replace function public.get_adres_share_meta(p_token uuid)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  v_wedding_id uuid;
  v_result jsonb;
begin
  select wedding_id into v_wedding_id from public.adres_shares where token = p_token;
  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'partner1Naam', w.partner1_naam,
    'partner2Naam', w.partner2_naam
  )
  into v_result
  from public.weddings w
  where w.id = v_wedding_id;

  return v_result;
end;
$$;
revoke all on function public.get_adres_share_meta(uuid) from public;
grant execute on function public.get_adres_share_meta(uuid) to anon, authenticated;
