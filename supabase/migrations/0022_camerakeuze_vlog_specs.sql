-- bestecamerakeuze.nl — vlog-specificaties op camerakeuze.products.
--
-- De `specs`-kolom (jsonb) blijft wat hij was: vrije label/waarde-paren voor de
-- merk-onafhankelijke specs-tabel op de detailpagina. Precies datgene waarop een vlogger
-- selecteert — klapscherm, microfooningang, opnameduur — hoort daar niet thuis, omdat je
-- er op wilt kunnen filteren en sorteren en omdat het verschil tussen "nee" en "onbekend"
-- betekenis heeft. Daarom losse, getypeerde kolommen in plaats van meer JSON.
--
-- Alle nieuwe kolommen zijn NULLABLE en NULL betekent overal hetzelfde: **niet
-- geverifieerd**. Wij vullen een veld alleen als het op de officiële productpagina van de
-- fabrikant staat; een gok is schadelijker dan een leeg vakje, want de hele waarde van
-- deze site is dat de tabel klopt. De UI toont NULL als "—", niet als "nee".

alter table camerakeuze.products
  -- Kantelt/klapt het scherm zo dat je jezelf ziet terwijl de lens op je gericht staat.
  -- flip_screen is de filterbare ja/nee, screen_type de leesbare omschrijving
  -- ("volledig uitklapbaar zijscherm", "kantelscherm 180° omhoog").
  add column flip_screen boolean,
  add column screen_type text,

  -- 'geen'     — geen stabilisatie
  -- 'digitaal' — elektronisch/in-crop (kost beeldhoek)
  -- 'optisch'  — sensor-shift in de body (IBIS)
  -- 'gimbal'   — mechanische 3-assige gimbal (DJI Osmo Pocket)
  -- Een gimbal is geen van de eerste drie en verdient een eigen waarde: het is het enige
  -- type dat looppassen echt wegneemt in plaats van verzacht.
  add column stabilisation text
    check (stabilisation in ('geen', 'digitaal', 'optisch', 'gimbal')),

  -- Een 3,5mm-aansluiting op de camera zelf. Een camera die alleen via een adapter,
  -- media-module of draadloze ontvanger een microfoon accepteert krijgt hier `false`;
  -- die nuance hoort in de redactionele tekst, niet in een boolean.
  add column mic_input boolean,
  add column headphone_out boolean,

  -- Maximale lengte van één clip. NULL als de fabrikant geen limiet publiceert;
  -- unlimited_recording = true als de fabrikant expliciet zegt dat er geen limiet is.
  add column max_clip_minutes integer check (max_clip_minutes > 0),
  add column unlimited_recording boolean,
  -- Staat het model erom bekend dat het bij lang filmen afslaat op temperatuur. Dit is
  -- als enige veld géén fabrieksspec — fabrikanten publiceren dit nooit — maar komt uit
  -- gepubliceerde reviews waarin het gemeten is. lib/external-reviews.ts houdt de bron bij.
  add column overheating_reported boolean,

  -- Gewicht inclusief accu en geheugenkaart. Staat ook als tekst in specs->>'Gewicht';
  -- hier als integer zodat de keuzehulp op gewicht kan rangschikken.
  add column weight_g integer check (weight_g > 0),

  add column autofocus_type text,

  -- Log- en kleurprofielen (S-Log3, F-Log2, D-Log M, GP-Log, HLG). text[] net als
  -- pros/cons; in de CSV pijp-gescheiden. Leeg = geen profielen óf niet geverifieerd —
  -- daarom staat er geen NOT NULL-belofte op de inhoud, alleen op de array zelf.
  add column log_profiles text[] not null default '{}',

  -- Accuduur in minuten video. Let op bij vergelijken: fabrikanten meten verschillend
  -- (CIPA "werkelijke opname" versus eigen tests met scherm uit). De UI zet die
  -- waarschuwing onder de tabel.
  add column battery_video_minutes integer check (battery_video_minutes > 0);

-- De keuzehulp rangschikt op gewicht ("met veel spullen op pad" wil het lichtste model).
create index products_weight_idx on camerakeuze.products (weight_g);

-- Prijs was NOT NULL omdat elke rij uit de demo-CSV een (verzonnen) prijs had. Nu er
-- producten in de catalogus staan waarvoor we nog géén feed hebben, is een verzonnen
-- prijs erger dan geen prijs: de site zou een bedrag tonen dat niemand heeft
-- gecontroleerd. NULL betekent "prijs nog niet uit de feed"; de UI toont dan de winkel-CTA
-- zonder bedrag in plaats van € 0,00.
alter table camerakeuze.products alter column price drop not null;
