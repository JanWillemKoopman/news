import { NextRequest, NextResponse } from 'next/server'

import { createRawAdminClient } from '@/lib/supabase/admin'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB server-side grens

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const weddingId = (formData.get('weddingId') as string | null)?.trim()
    const guestName = (formData.get('guestName') as string | null)?.trim() || null
    const message = (formData.get('message') as string | null)?.trim() || null

    if (!file || !weddingId) {
      return NextResponse.json({ error: 'Ontbrekende velden' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Foto te groot (max 10 MB)' }, { status: 413 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Alleen afbeeldingen toegestaan' }, { status: 415 })
    }

    const admin = createRawAdminClient()

    // Controleer of de fotomuur actief is voor deze bruiloft
    const { data: settings } = await admin
      .from('photo_wall_settings')
      .select('is_active, moderation_required')
      .eq('wedding_id', weddingId)
      .maybeSingle()

    if (!settings?.is_active) {
      return NextResponse.json({ error: 'Fotomuur is niet actief' }, { status: 403 })
    }

    // Upload naar Supabase Storage
    const bytes = await file.arrayBuffer()
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const storagePath = `${weddingId}/${filename}`

    const { error: uploadError } = await admin.storage
      .from('photo-wall')
      .upload(storagePath, bytes, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Foto-wall storage upload fout:', uploadError)
      return NextResponse.json({ error: 'Uploaden mislukt' }, { status: 500 })
    }

    const { data: { publicUrl } } = admin.storage.from('photo-wall').getPublicUrl(storagePath)

    // Sla foto op in database
    const { data: photo, error: insertError } = await admin
      .from('photo_wall_photos')
      .insert({
        wedding_id: weddingId,
        storage_path: storagePath,
        url: publicUrl,
        guest_name: guestName,
        message: message,
        is_approved: !settings.moderation_required,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Foto-wall insert fout:', insertError)
      await admin.storage.from('photo-wall').remove([storagePath])
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
    console.error('Foto-wall upload fout:', err)
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
