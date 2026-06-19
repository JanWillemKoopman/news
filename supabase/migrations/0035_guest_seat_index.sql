-- Vaste stoel/plek van een gast aan zijn tafel (tafelschikking).
-- 0-gebaseerd; null = nog geen vaste plek (de plattegrond plaatst de gast dan
-- automatisch op de eerstvolgende vrije stoel). Zo kan het bruidspaar zelf
-- bepalen wie op welke plek aan de tafel zit.

alter table public.guests
  add column if not exists stoel_index smallint;
