-- Herstel accept_invite: controleer dat de ingelogde gebruiker hetzelfde
-- e-mailadres heeft als de genodigde. Zonder deze check kon elke ingelogde
-- gebruiker een invite accepteren die bestemd was voor een ander persoon.

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.wedding_invites;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Niet ingelogd';
  end if;

  select * into v_invite from public.wedding_invites where token = p_token;
  if not found then
    raise exception 'Uitnodiging niet gevonden';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Uitnodiging is al gebruikt';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Uitnodiging is verlopen';
  end if;

  -- Verificeer dat het e-mailadres van de ingelogde gebruiker overeenkomt
  -- met het e-mailadres waarvoor de uitnodiging is aangemaakt.
  if lower(auth.email()) != lower(v_invite.email) then
    raise exception 'Dit account (%) is niet uitgenodigd voor deze bruiloft. Log in met %.',
      auth.email(), v_invite.email;
  end if;

  insert into public.wedding_members (wedding_id, user_id, role)
  values (v_invite.wedding_id, v_uid, v_invite.role)
  on conflict (wedding_id, user_id) do update set role = excluded.role;

  update public.wedding_invites set accepted_at = now() where id = v_invite.id;

  return v_invite.wedding_id;
end;
$$;
