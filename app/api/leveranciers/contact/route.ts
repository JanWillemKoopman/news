import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import { renderVendorContactEmail } from '@/lib/email/templates'
import { messageFromRow, vendorContactRequestFromRow, vendorFromRow } from '@/lib/bruiloft/mappers'
import { normaliseerWebsite } from '@/lib/bruiloft/suppliers/linked'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Verstuurt een offerte-/contactbericht naar een leverancier en logt het.
// In tegenstelling tot de andere e-mail-routes (invite, rsvp) faalt deze NIET
// "zacht" op een Resend-fout: versturen ís hier de kernactie die de gebruiker
// net heeft getriggerd, dus een mislukking moet als fout terugkomen zodat de
// compose-modal openblijft en het bericht niet kwijtraakt.

const bodySchema = z.object({
  weddingId: z.string().uuid(),
  type: z.enum(['offerte', 'contact']),
  onderwerp: z.string().trim().min(1),
  bericht: z.string().trim().min(1),
  vendor: z.object({
    vendorId: z.string().uuid().optional(),
    supplierId: z.string().optional(),
    tpwBusinessId: z.string().optional(),
    naam: z.string().trim().min(1),
    type: z.string().trim().min(1),
    email: z.string().trim().email(),
    telefoon: z.string().optional(),
    website: z.string().optional(),
  }),
})

// Status alleen ophogen naar 'offerte aangevraagd' als er nog niets verder
// besloten is — nooit downgraden vanaf 'geboekt'/'afgewezen'.
const OPHOOGBARE_STATUSSEN = ['te bezoeken', 'bezocht']

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const rawBody = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }
  const { weddingId, type, onderwerp, bericht, vendor } = parsed.data

  // 1. Vendor upsert via de user-scoped (RLS-respecterende) client — RLS
  // (can_edit(wedding_id,'leveranciers')) doet hier het autorisatiewerk,
  // exact zoals de bestaande addVendor/updateVendor-store-acties.
  // any: tpw_business_id ontbreekt in de gegenereerde database.types.ts
  // (bekende drift, zie ook de (r as any)-casts in lib/bruiloft/mappers.ts).
  let vendorRow: any = null

  if (vendor.vendorId) {
    const { data: bestaand, error: fetchError } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendor.vendorId)
      .eq('wedding_id', weddingId)
      .single()
    if (fetchError || !bestaand) {
      return NextResponse.json({ error: 'Leverancier niet gevonden' }, { status: 404 })
    }
    if (type === 'offerte' && OPHOOGBARE_STATUSSEN.includes(bestaand.status)) {
      const { data, error } = await supabase
        .from('vendors')
        .update({ status: 'offerte aangevraagd' })
        .eq('id', vendor.vendorId)
        .select()
        .single()
      if (error) return NextResponse.json({ error: 'Leverancier bijwerken mislukt' }, { status: 403 })
      vendorRow = data
    } else {
      vendorRow = bestaand
    }
  } else {
    // Dedupe: staat deze leverancier al in de lijst (zelfde logica als
    // isToegevoegd() client-side)?
    const { data: bestaandeVendors } = await supabase
      .from('vendors')
      .select('*')
      .eq('wedding_id', weddingId)
    const site = normaliseerWebsite(vendor.website ?? '')
    // any: zie tpw_business_id-toelichting hierboven.
    const gevonden = ((bestaandeVendors ?? []) as any[]).find(
      (v) =>
        (vendor.supplierId && v.supplier_id === vendor.supplierId) ||
        (vendor.tpwBusinessId && v.tpw_business_id != null && String(v.tpw_business_id) === vendor.tpwBusinessId) ||
        (site && v.website && normaliseerWebsite(v.website) === site)
    )

    if (gevonden) {
      if (type === 'offerte' && OPHOOGBARE_STATUSSEN.includes(gevonden.status)) {
        const { data, error } = await supabase
          .from('vendors')
          .update({ status: 'offerte aangevraagd' })
          .eq('id', gevonden.id)
          .select()
          .single()
        if (error) return NextResponse.json({ error: 'Leverancier bijwerken mislukt' }, { status: 403 })
        vendorRow = data
      } else {
        vendorRow = gevonden
      }
    } else {
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          wedding_id: weddingId,
          naam: vendor.naam,
          type: vendor.type,
          status: type === 'offerte' ? 'offerte aangevraagd' : 'te bezoeken',
          telefoon: vendor.telefoon ?? '',
          email: vendor.email,
          website: vendor.website ?? '',
          supplier_id: vendor.supplierId ?? null,
          // tpw_business_id: zie any-cast hierboven, ontbreekt in database.types.ts.
          ...(vendor.tpwBusinessId ? { tpw_business_id: parseInt(vendor.tpwBusinessId, 10) } : {}),
        } as any)
        .select()
        .single()
      if (error) return NextResponse.json({ error: 'Leverancier toevoegen mislukt' }, { status: 403 })
      vendorRow = data
    }
  }

  // 2. Ledenlijst: alleen nog voor de afzendernaam in het berichtencentrum.
  // Bewust GEEN cc/reply-to meer naar het bruidspaar: alle communicatie loopt
  // via de reageer-knop (token-link) zodat reacties in het berichtencentrum
  // landen i.p.v. in privé-mailboxen. De kopie voor het bruidspaar is de
  // "Verzonden"-map; de e-mail waarschuwt dat een direct antwoord niet aankomt.
  const { data: members } = await supabase.rpc('list_wedding_members', { p_wedding: weddingId })

  // Afzendernamen voor in de e-mail ("Anna & Tom").
  const { data: weddingRow } = await supabase
    .from('weddings')
    .select('partner1_naam, partner2_naam')
    .eq('id', weddingId)
    .maybeSingle()
  const afzenderNamen =
    [weddingRow?.partner1_naam, weddingRow?.partner2_naam].filter(Boolean).join(' & ') ||
    'Een bruidspaar'

  // Reageer-token: de knop in de e-mail laat de leverancier zonder account
  // reageren via /reactie/<token>; de reactie landt als inbound bericht in
  // het berichtencentrum. Token wordt hieronder op de messages-rij bewaard.
  const replyToken = crypto.randomUUID()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  const replyUrl = siteUrl ? `${siteUrl}/reactie/${replyToken}` : null

  // 3. Versturen.
  const { subject, html } = renderVendorContactEmail({ type, onderwerp, bericht, afzenderNamen, replyUrl })
  try {
    const resend = getResend()
    const { error: sendError } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: vendor.email,
      subject,
      html,
    })
    if (sendError) {
      console.error('[leveranciers/contact] Resend fout:', sendError)
      return NextResponse.json({ error: 'Versturen mislukt. Probeer het opnieuw.' }, { status: 502 })
    }
  } catch (err) {
    console.error('[leveranciers/contact] Onverwachte fout:', err)
    return NextResponse.json({ error: 'Versturen mislukt. Probeer het opnieuw.' }, { status: 502 })
  }

  // 4. Loggen (append-only geschiedenis). De e-mail is op dit punt al
  // verstuurd; een mislukte log-insert mag de gebruiker niet laten denken dat
  // versturen mislukte (dat zou tot een dubbele e-mail kunnen leiden).
  const { data: logRow, error: logError } = await supabase
    .from('vendor_contact_requests')
    .insert({
      wedding_id: weddingId,
      vendor_id: vendorRow!.id,
      type,
      onderwerp,
      bericht,
      verzonden_naar: vendor.email,
      verzonden_door: user.id,
    })
    .select()
    .single()
  if (logError) {
    console.error('[leveranciers/contact] Log-insert mislukt:', logError)
  }

  // 5. Spiegel-rij in messages (berichtencentrum "Verzonden"). Ook
  // best-effort: het bericht is al verstuurd en gelogd, dit is puur de
  // weergave in de mailbox.
  const afzenderNaam =
    (members ?? []).find((m: { user_id: string }) => m.user_id === user.id)?.display_name ||
    user.email ||
    ''
  // any: messages ontbreekt nog in de gegenereerde database.types.ts (nieuwe
  // migratie 0058, types nog niet geregenereerd), zelfde drift-patroon als
  // tpw_business_id hierboven.
  const { data: messageRow, error: messageError } = await (supabase as any)
    .from('messages')
    .insert({
      wedding_id: weddingId,
      direction: 'outbound',
      type: type === 'offerte' ? 'leverancier_offerte' : 'leverancier_contact',
      vendor_id: vendorRow!.id,
      onderwerp,
      inhoud: bericht,
      afzender_naam: afzenderNaam,
      afzender_type: 'gebruiker',
      verzonden_door: user.id,
      status: 'verzonden',
      // Zonder deze rij werkt de reageer-knop in de zojuist verstuurde e-mail
      // niet (token onvindbaar); de insert-fout hieronder wordt daarom gelogd.
      reply_token: replyToken,
    })
    .select()
    .single()
  if (messageError) {
    console.error('[leveranciers/contact] Message-insert mislukt:', messageError)
  }

  return NextResponse.json({
    ok: true,
    vendor: vendorFromRow(vendorRow as Parameters<typeof vendorFromRow>[0]),
    contactRequest: logRow ? vendorContactRequestFromRow(logRow) : null,
    message: messageRow ? messageFromRow(messageRow) : null,
  })
}
