-- Sla de gekozen dashboardsfeer op per gebruiker.
-- Mogelijke waarden: 'standaard' | 'dark' | 'roze' | 'paars'
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dashboard_theme text NOT NULL DEFAULT 'standaard'
  CHECK (dashboard_theme IN ('standaard', 'dark', 'roze', 'paars'));
