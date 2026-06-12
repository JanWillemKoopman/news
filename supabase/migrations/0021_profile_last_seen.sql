-- Sla bij wanneer een gebruiker voor het laatst actief was in de app.
-- Wordt fire-and-forget bijgewerkt vanuit de AI-routes.
alter table public.profiles
  add column if not exists last_seen_at timestamptz;
