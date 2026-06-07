-- Bewaar de originele aanmeldtijdstip: alleen invullen bij eerste inzending.
-- Eerder stond hier rsvp_submitted_at = now(), waardoor re-submissions de
-- originele timestamp overschreven.
create or replace function public.submit_rsvp(p_token text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests;
  v_status text := p_payload ->> 'rsvpStatus';
begin
  select * into v_guest from public.guests
  where rsvp_token = p_token and rsvp_token_revoked = false;
  if not found then
    raise exception 'Ongeldige of ingetrokken uitnodiging';
  end if;

  if v_status is not null and v_status not in ('bevestigd', 'afgemeld') then
    raise exception 'Ongeldige RSVP-status';
  end if;

  update public.guests set
    rsvp_status        = coalesce(v_status, rsvp_status),
    dieetwensen        = coalesce(p_payload ->> 'dieetwensen', dieetwensen),
    heeft_partner      = coalesce((p_payload ->> 'heeftPartner')::boolean, heeft_partner),
    partner_naam       = coalesce(p_payload ->> 'partnerNaam', partner_naam),
    aantal_kinderen    = coalesce((p_payload ->> 'aantalKinderen')::integer, aantal_kinderen),
    rsvp_submitted_at  = coalesce(rsvp_submitted_at, now())
  where id = v_guest.id;
end;
$$;
