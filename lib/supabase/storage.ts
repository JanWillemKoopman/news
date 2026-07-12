import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'wedding-media'

export async function uploadWeddingMedia(
  supabase: SupabaseClient,
  weddingId: string,
  file: File,
  subfolder: 'header' | 'gallerij' | 'sectie-fotos' | 'moodboard'
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const naam = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const pad = `${weddingId}/${subfolder}/${naam}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pad, file, { upsert: false, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pad)
  return data.publicUrl
}

export async function deleteWeddingMedia(
  supabase: SupabaseClient,
  publicUrl: string
): Promise<void> {
  // Pad extraheren uit de publieke URL: alles na /wedding-media/
  const marker = `/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const pad = publicUrl.slice(idx + marker.length)
  await supabase.storage.from(BUCKET).remove([pad])
}

// --- Documentenkluis (private bucket) ----------------------------------
// Anders dan wedding-media is 'vendor-documents' een PRIVATE bucket:
// contracten en offertes horen niet op een publieke URL. Uploaden/lezen/
// verwijderen loopt via de RLS-policies uit migratie 0068 (leden van de
// bruiloft); openen gaat via een kortlevende signed URL.

const DOCUMENTS_BUCKET = 'vendor-documents'

// Uploadt een document en geeft het storage-pad terug (géén publieke URL —
// het pad wordt bewaard op de vendor_documents-rij).
export async function uploadVendorDocument(
  supabase: SupabaseClient,
  weddingId: string,
  vendorId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const naam = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const pad = `${weddingId}/leveranciers/${vendorId}/${naam}`
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(pad, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return pad
}

// Kortlevende download-link; RLS staat signen alleen toe voor leden van de
// bijbehorende bruiloft. `download` forceert Content-Disposition: attachment
// zodat de browser het bestand altijd downloadt i.p.v. probeert weer te
// geven — anders faalt dat stil voor bestandstypen die de browser niet kan
// tonen (bv. .docx, .xlsx).
export async function createVendorDocumentUrl(
  supabase: SupabaseClient,
  storagePath: string,
  bestandsnaam: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 5, { download: bestandsnaam })
  if (error) throw error
  return data.signedUrl
}

export async function deleteVendorDocumentFile(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath])
}

// --- Documentenkluis (budgetposten, private bucket) --------------------
// Zelfde opzet als vendor-documents hierboven, maar dan 'budget-documents'
// (migratie 0075) — offertes/contracten/facturen gekoppeld aan een
// budgetpost in plaats van een leverancier.

const BUDGET_DOCUMENTS_BUCKET = 'budget-documents'

export async function uploadBudgetItemDocument(
  supabase: SupabaseClient,
  weddingId: string,
  budgetItemId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const naam = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const pad = `${weddingId}/budget/${budgetItemId}/${naam}`
  const { error } = await supabase.storage
    .from(BUDGET_DOCUMENTS_BUCKET)
    .upload(pad, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return pad
}

// Kortlevende download-link; RLS staat signen alleen toe voor leden van de
// bijbehorende bruiloft. `download` forceert Content-Disposition: attachment
// zodat de browser het bestand altijd downloadt i.p.v. probeert weer te
// geven — anders faalt dat stil voor bestandstypen die de browser niet kan
// tonen (bv. .docx, .xlsx).
export async function createBudgetItemDocumentUrl(
  supabase: SupabaseClient,
  storagePath: string,
  bestandsnaam: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUDGET_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 5, { download: bestandsnaam })
  if (error) throw error
  return data.signedUrl
}

export async function deleteBudgetItemDocumentFile(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  await supabase.storage.from(BUDGET_DOCUMENTS_BUCKET).remove([storagePath])
}

// --- Documentenverkenner (private bucket) -------------------------------
// Zelfde opzet als vendor-documents/budget-documents hierboven, maar dan
// 'wedding-documents' (migratie 0079) — de centrale documentenmap. De
// mapindeling is metadata (documents.folder_id), niet het storage-pad:
// een bestand verplaatsen is dan een metadata-update, geen storage-move.

const WEDDING_DOCUMENTS_BUCKET = 'wedding-documents'

export async function uploadWeddingDocument(
  supabase: SupabaseClient,
  weddingId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const naam = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const pad = `${weddingId}/documenten/${naam}`
  const { error } = await supabase.storage
    .from(WEDDING_DOCUMENTS_BUCKET)
    .upload(pad, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return pad
}

// Kortlevende download-link; RLS staat signen alleen toe voor leden van de
// bijbehorende bruiloft. `download` forceert Content-Disposition: attachment
// — zelfde reden als bij createVendorDocumentUrl.
export async function createWeddingDocumentUrl(
  supabase: SupabaseClient,
  storagePath: string,
  bestandsnaam: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(WEDDING_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 5, { download: bestandsnaam })
  if (error) throw error
  return data.signedUrl
}

export async function deleteWeddingDocumentFile(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  await supabase.storage.from(WEDDING_DOCUMENTS_BUCKET).remove([storagePath])
}
