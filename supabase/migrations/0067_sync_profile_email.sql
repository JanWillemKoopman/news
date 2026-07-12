-- =====================================================================
-- Fix (audit 2026-07-11): profiles.email liep uit sync met de auth-e-mail.
--
-- /api/profiel schreef het nieuwe e-mailadres meteen naar profiles.email,
-- nog vóór de gebruiker het via de auth-bevestigingsmail bevestigde. Daardoor
-- kon profiles.email een onbevestigde, door de gebruiker gekozen waarde
-- bevatten die afweek van het echte (geverifieerde) auth.users.email. De
-- uitnodigingsflows zoeken accounts op via profiles.email, dus dat was ook een
-- account-verwarringsrisico.
--
-- Vanaf nu is profiles.email een spiegel van het GEVERIFIEERDE auth-adres:
-- de route schrijft het niet meer direct (zie app/api/profiel), en deze
-- trigger synct profiles.email zodra auth.users.email daadwerkelijk verandert
-- (dat gebeurt pas ná bevestiging). Zelfde patroon als handle_new_user, dat
-- profiles.email bij registratie vult.
-- =====================================================================

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = new.email, updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_email on auth.users;
create trigger trg_sync_profile_email
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
