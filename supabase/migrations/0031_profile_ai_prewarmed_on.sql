-- Houdt bij op welke kalenderdag de AI-content voor een gebruiker het laatst is
-- voorverwarmd. Gebruikt als idempotente dag-guard door de eerste-login-prewarm,
-- zodat per gebruiker hooguit één keer per dag een Gemini-call wordt gedaan
-- (ook bij meerdere tabs of herhaalde logins).
alter table public.profiles
  add column if not exists ai_prewarmed_on date;
