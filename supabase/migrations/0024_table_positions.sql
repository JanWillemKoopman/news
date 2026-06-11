-- Positie en rotatie van tafels op de plattegrond (desktop-editor).
-- Nullable positie = nog niet geplaatst; de plattegrond kiest dan een
-- automatische plek totdat de tafel voor het eerst versleept wordt.

alter table public.tables
  add column pos_x double precision,
  add column pos_y double precision,
  add column rotatie smallint not null default 0;
