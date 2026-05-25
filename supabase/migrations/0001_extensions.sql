-- Extensies. pgcrypto levert gen_random_bytes() voor onraadbare RSVP-/invite-tokens.
-- (gen_random_uuid() zit in de core sinds PG13 en hoeft niet uit een extensie.)
create extension if not exists pgcrypto with schema extensions;
