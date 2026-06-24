import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

import { logAiUsage } from '@/lib/ai/usage'
import { GASTTYPES, GUEST_CATEGORIEEN, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import type { Gasttype, GuestCategorie, RsvpStatus } from '@/lib/bruiloft/types'
import { checkRateLimit } from '@/lib/rateLimit'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Eén geïmporteerde gast — exact het NewGuest-contract (Omit<GuestInput,'weddingId'>).
export interface ImportGuest {
  voornaam: string
  achternaam: string
  categorie: GuestCategorie
  gasttype: Gasttype
  rsvpStatus: RsvpStatus
  dieetwensen: string
  heeftPartner: boolean
  partnerNaam: string
  aantalKinderen: number
  adres: string
  notitie: string
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB, gelijk aan de foto-upload
const MODEL = 'gemini-2.5-flash'

// Mime-types die Gemini multimodaal rechtstreeks kan lezen (geen tekst-extractie nodig).
const INLINE_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
])

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

// Zet een Excel/Word/tekst-bestand om naar platte tekst die we in de prompt stoppen.
async function bestandNaarTekst(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = extOf(file.name)
  const mime = file.type

  if (ext === 'xlsx' || ext === 'xls' || mime.includes('spreadsheet') || mime.includes('excel')) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    return wb.SheetNames
      .map((naam) => `# Blad: ${naam}\n${XLSX.utils.sheet_to_csv(wb.Sheets[naam])}`)
      .join('\n\n')
      .slice(0, 200_000)
  }

  if (ext === 'docx' || mime.includes('wordprocessingml')) {
    const mammoth = await import('mammoth')
    const { value } = await mammoth.extractRawText({ buffer })
    return value.slice(0, 200_000)
  }

  // CSV, TXT en overige tekstformaten: rauw als UTF-8 lezen.
  return buffer.toString('utf-8').slice(0, 200_000)
}

function buildPrompt(bronTekst: string | null, partner1: string, partner2: string): string {
  const categorieRegels = GUEST_CATEGORIEEN.map((c) => {
    if (c === 'familie partner 1') return `- "familie partner 1" = familie van ${partner1 || 'partner 1'}`
    if (c === 'familie partner 2') return `- "familie partner 2" = familie van ${partner2 || 'partner 2'}`
    return `- "${c}"`
  }).join('\n')

  return `Je bent een nauwkeurige assistent die een bestaande gastenlijst voor een Nederlandse bruiloft \
omzet naar gestructureerde data. Het bruidspaar is ${partner1 || 'partner 1'} en ${partner2 || 'partner 2'}.

Analyseer de aangeleverde gastenlijst (bestand of geplakte tekst) en extraheer ELKE genodigde als afzonderlijke gast.

Mapping-regels:
- categorie — kies exact één van deze waarden:
${categorieRegels}
  Kies "overig" als je het niet zeker weet.
- gasttype — exact één van: ${GASTTYPES.join(', ')}. Standaard "daggast" tenzij duidelijk avondgast.
- rsvpStatus — exact één van: ${RSVP_STATUSSEN.join(', ')}. Standaard "uitgenodigd" tenzij de bron een reactie aangeeft (ja/aanwezig → "bevestigd", nee/afwezig → "afgemeld").
- heeftPartner — true als er een partner/begeleider/"+1" wordt genoemd. Zet de partnernaam in partnerNaam (leeg als onbekend).
- aantalKinderen — geheel getal ≥ 0, alleen als de bron kinderen vermeldt; anders 0. Tel kinderen NIET als losse gasten als ze als "X kinderen" bij iemand horen.
- dieetwensen, adres, notitie — vul alleen als de bron dit bevat, anders een lege string "".
- Splits "Jan en Marie de Vries" in twee gasten als het twee aparte volwassenen zijn, of in één gast met partner als dat logischer is.
- Verzin GEEN namen of gegevens die niet in de bron staan. Sla kopregels/totalen/lege regels over.

${bronTekst ? `Hier is de gastenlijst (tekst):\n"""\n${bronTekst}\n"""` : 'De gastenlijst zit in het bijgevoegde bestand.'}

Geef ALLEEN een JSON-object terug in exact dit formaat:
{
  "samenvatting": "1-2 zinnen: hoeveel gasten gevonden en eventuele opvallendheden",
  "gasten": [
    {
      "voornaam": "",
      "achternaam": "",
      "categorie": "vrienden",
      "gasttype": "daggast",
      "rsvpStatus": "uitgenodigd",
      "dieetwensen": "",
      "heeftPartner": false,
      "partnerNaam": "",
      "aantalKinderen": 0,
      "adres": "",
      "notitie": ""
    }
  ]
}`
}

const CATSET = new Set<string>(GUEST_CATEGORIEEN)
const TYPESET = new Set<string>(GASTTYPES)
const RSVPSET = new Set<string>(RSVP_STATUSSEN)

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

// Saneer een ruwe AI-rij naar een geldige ImportGuest; dwing enums en types af.
function saneer(raw: unknown): ImportGuest | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const voornaam = str(r.voornaam)
  const achternaam = str(r.achternaam)
  if (!voornaam && !achternaam) return null // minstens een naam vereist

  const categorie = (CATSET.has(r.categorie as string) ? r.categorie : 'overig') as GuestCategorie
  const gasttype = (TYPESET.has(r.gasttype as string) ? r.gasttype : 'daggast') as Gasttype
  const rsvpStatus = (RSVPSET.has(r.rsvpStatus as string) ? r.rsvpStatus : 'uitgenodigd') as RsvpStatus
  const heeftPartner = r.heeftPartner === true || str(r.partnerNaam).length > 0
  const aantalKinderen = Math.max(0, Math.round(Number(r.aantalKinderen) || 0))

  return {
    voornaam,
    achternaam,
    categorie,
    gasttype,
    rsvpStatus,
    dieetwensen: str(r.dieetwensen),
    heeftPartner,
    partnerNaam: heeftPartner ? str(r.partnerNaam) : '',
    aantalKinderen,
    adres: str(r.adres),
    notitie: str(r.notitie),
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI niet geconfigureerd' }, { status: 503 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Ongeldige request' }, { status: 400 })
  }

  const weddingId = String(form.get('weddingId') || '')
  const partner1 = String(form.get('partner1') || '')
  const partner2 = String(form.get('partner2') || '')
  const tekstInput = String(form.get('text') || '').trim()
  const file = form.get('file')

  if (!weddingId) {
    return NextResponse.json({ error: 'Ontbrekende weddingId' }, { status: 400 })
  }
  if (!tekstInput && !(file instanceof File)) {
    return NextResponse.json({ error: 'Geef een bestand of tekst op' }, { status: 400 })
  }
  if (file instanceof File && file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Bestand te groot (max 10 MB)' }, { status: 413 })
  }

  // Toegang: alleen leden van deze bruiloft mogen importeren.
  const { data: member } = await supabase
    .from('wedding_members')
    .select('role')
    .eq('wedding_id', weddingId)
    .eq('user_id', user.id)
    .single()
  if (!member) {
    return NextResponse.json({ error: 'Geen toegang tot deze bruiloft' }, { status: 403 })
  }

  const rl = await checkRateLimit(`ai:gasten-import:${user.id}`, 10, 60 * 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Te veel verzoeken, probeer het over een uur opnieuw.' }, { status: 429 })
  }

  // Bouw de Gemini-invoer: PDF/afbeelding gaat inline, de rest wordt tekst.
  let bronTekst: string | null = tekstInput || null
  let inlinePart: { inlineData: { data: string; mimeType: string } } | null = null

  if (file instanceof File) {
    const isInline = INLINE_MIMES.has(file.type) || extOf(file.name) === 'pdf'
    if (isInline) {
      const data = Buffer.from(await file.arrayBuffer()).toString('base64')
      inlinePart = { inlineData: { data, mimeType: file.type || 'application/pdf' } }
    } else {
      try {
        bronTekst = await bestandNaarTekst(file)
      } catch {
        return NextResponse.json({ error: 'Bestand kon niet gelezen worden' }, { status: 422 })
      }
      if (!bronTekst.trim()) {
        return NextResponse.json({ error: 'Geen leesbare inhoud in het bestand' }, { status: 422 })
      }
    }
  }

  const prompt = buildPrompt(bronTekst, partner1, partner2)
  const startTijd = Date.now()

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: 'application/json' },
  })
  const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [prompt]
  if (inlinePart) parts.push(inlinePart)

  // Streamende NDJSON-respons: per regel één JSON-event (\n-gescheiden).
  // De client toont de gevonden namen live terwijl het model ze produceert.
  const encoder = new TextEncoder()
  // Pakt voltooide voornaam+achternaam-paren uit de tot dusver ontvangen tekst.
  const NAAM_RE = /"voornaam"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"achternaam"\s*:\s*"((?:[^"\\]|\\.)*)"/g

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      let vol = ''
      let gevonden = 0

      try {
        const result = await model.generateContentStream(parts as any)
        for await (const chunk of result.stream) {
          vol += chunk.text()

          // Tel de tot nu toe voltooide gasten en stuur alleen de nieuwe namen door.
          NAAM_RE.lastIndex = 0
          const namen: string[] = []
          let m: RegExpExecArray | null
          while ((m = NAAM_RE.exec(vol)) !== null) {
            namen.push(`${m[1]} ${m[2]}`.replace(/\\"/g, '"').trim())
          }
          if (namen.length > gevonden) {
            const nieuw = namen.slice(gevonden)
            gevonden = namen.length
            emit({ type: 'progress', gevonden, nieuw })
          }
        }

        const cleaned = vol.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        const parsed = JSON.parse(cleaned) as { samenvatting?: string; gasten?: unknown[] }
        const gasten = Array.isArray(parsed.gasten)
          ? parsed.gasten.map(saneer).filter((g): g is ImportGuest => g !== null)
          : []

        logAiUsage({
          endpoint: 'gasten-import',
          model: MODEL,
          latencyMs: Date.now() - startTijd,
          success: true,
          promptChars: prompt.length,
          responseChars: vol.length,
          userId: user.id,
          weddingId,
        })

        emit({
          type: 'done',
          samenvatting: str(parsed.samenvatting) || `${gasten.length} ${gasten.length === 1 ? 'gast' : 'gasten'} gevonden.`,
          gasten,
        })
      } catch (err) {
        console.error('[api/ai/gasten-import] fout:', err)
        logAiUsage({
          endpoint: 'gasten-import',
          model: MODEL,
          latencyMs: Date.now() - startTijd,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          userId: user.id,
          weddingId,
        })
        emit({ type: 'error', error: 'AI kon de lijst niet verwerken. Probeer het opnieuw.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
