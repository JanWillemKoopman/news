import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const slug = (formData.get('slug') as string | null)?.trim()
    const guestName = (formData.get('guestName') as string | null)?.trim() || null
    const message = (formData.get('message') as string | null)?.trim() || null

    if (!file || !slug) {
      return NextResponse.json({ error: 'Ontbrekende velden' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Foto te groot (max 10 MB)' }, { status: 413 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Alleen afbeeldingen toegestaan' }, { status: 415 })
    }

    // Anon-client: de foto-wall policies laten anon toe als de muur actief is.
    // Geen service-role key nodig.
    const supabase = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Haal bruiloft + instellingen op via SECURITY DEFINER RPC (werkt als anon)
    const { data: wall, error: wallError } = await supabase.rpc('get_photo_wall', { p_slug: slug })
    if (wallError || !wall) {
      return NextResponse.json({ error: 'Bruiloft niet gevonden' }, { status: 404 })
    }
    if (!wall.settings?.isActive) {
      return NextResponse.json({ error: 'Fotomuur is niet actief' }, { status: 403 })
    }

    const weddingId: string = wall.weddingId
    const moderationRequired: boolean = wall.settings?.moderationRequired ?? false

    // Upload naar Storage (photo_wall_anon_upload policy staat dit toe)
    const bytes = await file.arrayBuffer()
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const storagePath = `${weddingId}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('photo-wall')
      .upload(storagePath, bytes, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Storage upload fout:', uploadError)
      return NextResponse.json({ error: 'Uploaden mislukt' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('photo-wall').getPublicUrl(storagePath)

    // Sla op in database (pwp_insert_anon policy staat dit toe als muur actief is)
    const { data: photo, error: insertError } = await supabase
      .from('photo_wall_photos')
      .insert({
        wedding_id: weddingId,
        storage_path: storagePath,
        url: publicUrl,
        guest_name: guestName,
        message: message,
        is_approved: !moderationRequired,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Foto insert fout:', insertError)
      await supabase.storage.from('photo-wall').remove([storagePath])
      return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
    }

    return NextResponse.json({
      photo: {
        id: photo.id,
        url: photo.url,
        guestName: photo.guest_name,
        message: photo.message,
        isFeatured: photo.is_featured,
        isApproved: photo.is_approved,
        uploadedAt: photo.uploaded_at,
      },
    })
  } catch (err) {
    console.error('Upload fout:', err)
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
