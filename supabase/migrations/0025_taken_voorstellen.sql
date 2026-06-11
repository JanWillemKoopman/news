-- Beslissingen over taakvoorstellen ("takenlijst samenstellen") verhuizen van
-- localStorage naar de bruiloft zelf, zodat ze tussen partners en apparaten
-- synchroniseren. Vorm: { "beslist": { "<titel>": "toegevoegd|overgeslagen" },
-- "afgerond": boolean }.

alter table public.weddings
  add column taken_voorstellen jsonb not null default '{}'::jsonb;
