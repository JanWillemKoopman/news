-- Rate limiting voor AI-endpoints: telt AI-aanroepen per bruiloft, per endpoint, per uur.
-- Vervangt de onbetrouwbare in-memory Map in serverless-omgevingen.

create table public.ai_rate_limits (
  wedding_id   uuid        not null references public.weddings(id) on delete cascade,
  endpoint     text        not null,
  hour_bucket  timestamptz not null,
  call_count   integer     not null default 0,
  primary key  (wedding_id, endpoint, hour_bucket)
);

alter table public.ai_rate_limits enable row level security;

-- Verhoogt de teller en retourneert true als het verzoek binnen het limiet valt.
-- Gebruikt SECURITY DEFINER zodat de RLS-check op wedding_members al door de route is gedaan.
create or replace function public.ai_rate_limit_increment(
  p_wedding_id  uuid,
  p_endpoint    text,
  p_max_calls   integer
) returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_bucket    timestamptz := date_trunc('hour', now());
  v_count     integer;
begin
  insert into public.ai_rate_limits (wedding_id, endpoint, hour_bucket, call_count)
  values (p_wedding_id, p_endpoint, v_bucket, 1)
  on conflict (wedding_id, endpoint, hour_bucket)
  do update set call_count = ai_rate_limits.call_count + 1
  returning call_count into v_count;

  return v_count <= p_max_calls;
end;
$$;

grant execute on function public.ai_rate_limit_increment to authenticated;
