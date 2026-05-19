import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { ai } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const SUPPORTED_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/html',
  'text/markdown',
  'application/rtf',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  // Audio
  'audio/wav',
  'audio/mpeg',
  'audio/mp4',
  'audio/aiff',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  // Video
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
])

export async function POST(req: NextRequest) {
  let tempPath: string | null = null
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Geen bestand ontvangen' }, { status: 400 })
    }
    if (!SUPPORTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Bestandstype '${file.type}' wordt niet ondersteund` },
        { status: 400 }
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Bestand is te groot (maximaal 10 MB)' },
        { status: 400 }
      )
    }

    // Write to a temp file so the Gemini SDK can read it
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    tempPath = join(tmpdir(), `genai-upload-${Date.now()}-${safeName}`)
    await writeFile(tempPath, buffer)

    // Upload to Gemini Files API
    const uploaded = await ai.files.upload({
      file: tempPath,
      config: { mimeType: file.type, displayName: file.name },
    })

    return NextResponse.json({
      uri: uploaded.uri,
      mimeType: uploaded.mimeType ?? file.type,
      displayName: file.name,
      size: file.size,
    })
  } catch (err) {
    console.error('[API /upload-file]', err)
    return NextResponse.json({ error: 'Upload mislukt' }, { status: 500 })
  } finally {
    if (tempPath) await unlink(tempPath).catch(() => {})
  }
}
