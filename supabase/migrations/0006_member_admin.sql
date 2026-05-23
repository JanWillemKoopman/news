-- Ledenlijst met naam/e-mail. Leden mogen elkaars basisprofiel niet direct
-- lezen (profiles-RLS), dus dit loopt via een definer-RPC die op lidmaatschap
-- van DEZE bruiloft controleert.
create or replace function public.list_wedding_members(p_wedding uuid)
returns table (user_id uuid, email text, display_name text, role text)
language sql
security definer
stable
set search_path = public
as $$
  select m.user_id, p.email, p.display_name, m.role
  from public.wedding_members m
  join public.profiles p on p.id = m.user_id
  where m.wedding_id = p_wedding
    and public.is_wedding_member(p_wedding)
  order by
    case m.role
      when 'owner' then 0
      when 'planner' then 1
      when 'helper' then 2
      else 3
    end,
    coalesce(p.display_name, p.email);
$$;

revoke all on function public.list_wedding_members(uuid) from public;
grant execute on function public.list_wedding_members(uuid) to authenticated;
