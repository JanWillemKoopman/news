-- =====================================================================
-- Security fixes (audit 2026-06-10)
-- =====================================================================

-- ─── 1. Verwijder open anon-policies op registry-tabellen ────────────
--
-- De vier policies hieronder gaven iedereen met de publieke anon-sleutel
-- rechtstreeks schrijf-/verwijderrechten op de cadeaulijst-tabellen,
-- omzeilend de beveiligde RPC's. Alle legitieme schrijfacties lopen via
-- SECURITY DEFINER-functies (reserve_registry_item,
-- cancel_reservation_by_token) of via server-side API-routes met de
-- service-role-sleutel — die hebben geen RLS-policies nodig.

DROP POLICY IF EXISTS registry_reservations_insert   ON public.registry_reservations;
DROP POLICY IF EXISTS registry_reservations_delete   ON public.registry_reservations;
DROP POLICY IF EXISTS registry_contributions_insert  ON public.registry_contributions;
DROP POLICY IF EXISTS registry_contributions_update_self ON public.registry_contributions;

-- ─── 2. Voeg confirmation_token toe aan bijdragen ───────────────────
--
-- Elke nieuwe bijdrage krijgt een uniek token dat bij aanmaak naar de
-- gast wordt teruggestuurd. Het confirm-endpoint vereist dit token,
-- zodat alleen de echte indiener de bijdrage kan bevestigen.

ALTER TABLE public.registry_contributions
  ADD COLUMN IF NOT EXISTS confirmation_token text;

-- ─── 3. Verwijder ongebruikte functie met zwakke vergelijking ────────
--
-- check_registry_password vergelijkt platte tekst met een scrypt-hash
-- (altijd false). De route gebruikt verifyPassword() in Node.js.
-- De functie staat open voor anon via direct RPC — verwijderen.

REVOKE ALL ON FUNCTION public.check_registry_password(text, text) FROM anon, authenticated;
DROP FUNCTION IF EXISTS public.check_registry_password(text, text);

-- ─── 4. Storage-buckets in versiebeheer ─────────────────────────────

-- avatars: profielfoto's — elk account overschrijft alleen zijn eigen bestand
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload"      ON storage.objects;
DROP POLICY IF EXISTS "avatars_update"      ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete"      ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE (auth.uid()::text || '.%')
  );

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING  (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '.%'))
  WITH CHECK (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '.%'));

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND name LIKE (auth.uid()::text || '.%'));

-- registry-images: cadeaulijst-afbeeldingen per bruiloft
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'registry-images',
  'registry-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "registry_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "registry_images_upload"      ON storage.objects;
DROP POLICY IF EXISTS "registry_images_delete"      ON storage.objects;

CREATE POLICY "registry_images_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'registry-images');

CREATE POLICY "registry_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'registry-images'
    AND (storage.foldername(name))[1] IN (
      SELECT w.id::text
      FROM public.weddings w
      JOIN public.wedding_members m ON m.wedding_id = w.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "registry_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'registry-images'
    AND (storage.foldername(name))[1] IN (
      SELECT w.id::text
      FROM public.weddings w
      JOIN public.wedding_members m ON m.wedding_id = w.id
      WHERE m.user_id = auth.uid()
    )
  );
