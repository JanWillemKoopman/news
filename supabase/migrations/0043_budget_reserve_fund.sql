-- Reservefonds voor onvoorziene kosten. Nullable-vrij: bestaande bruiloften
-- krijgen 0 als startwaarde, geen backfill nodig.

alter table public.weddings
  add column if not exists reserve_bedrag numeric(12, 2) not null default 0;
