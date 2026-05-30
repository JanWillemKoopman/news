import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'wedding-media'

export async function uploadWeddingMedia(
  supabase: SupabaseClient,
  weddingId: string,
  file: File,
  subfolder: 'header' | 'gallerij' | 'sectie-fotos'
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
