import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { messageFromRow } from '@/lib/bruiloft/mappers'
import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import { renderVendorFollowUpEmail } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Vervolgbericht van het bruidspaar binnen een bestaand leveranciersgesprek.
// Kan alleen op een gesprek dat ooit als offerte-/contactaanvraag is gestart
// (dus een reply_token heeft): dat token is dezelfde reageer-link die de
// leverancier al in de eerste e-mail kreeg en blijft voor het hele gesprek
// geldig — er komt geen nieuw token per vervolgbericht.

const bodySchema = z.object({
  bericht: z.string().trim().min(1).max(5000),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

  // any: messages ontbreekt nog in de gegenereerde database.types.ts, zelfde
  // drift-patroon als in /api/leveranciers/contact.
  const { data: bericht, error: berichtError } = await (supabase as any)
    .from('messages')
    .select('id, wedding_id, vendor_id, onderwerp, parent_message_id, reply_token')
    .eq('id', params.id)
    .maybeSingle()
  if (berichtError || !bericht) {
    return NextResponse.json({ error: 'Bericht niet gevonden' }, { status: 404 })
  }

  // De thread-root is het openingsbericht (offerte/contact): dat draagt het
  // reply_token waarmee de leverancier — zonder account — kan reageren.
  let root = bericht
  if (bericht.parent_message_id) {
    const { data: rootRow, error: rootError } = await (supabase as any)
      .from('messages')
      .select('id, wedding_id, vendor_id, onderwerp, reply_token')
      .eq('id', bericht.parent_message_id)
      .maybeSingle()
    if (rootError || !rootRow) {
      return NextResponse.json({ error: 'Gesprek niet gevonden' }, { status: 404 })
    }
    root = rootRow
  }

  if (!root.vendor_id || !root.reply_token) {
    return NextResponse.json({ error: 'Dit gesprek kan niet beantwoord worden' }, { status: 400 })
  }

  // Zelfde autorisatie als /api/leveranciers/contact: contact opnemen met een
  // leverancier vereist edit-rechten op de leveranciers-module. Bij die route
  // gebeurt dit impliciet via de vendor-upsert-stap (die al RLS-gated is);
  // hier is er geen schrijfstap vóór het versturen van de e-mail, dus moet de
  // check expliciet — anders zou een kijker/viewer alsnog een echte e-mail
  // naar een leverancier kunnen laten versturen.
  const { data: magBewerken } = await supabase.rpc('can_edit', {
    p_wedding: root.wedding_id,
    p_module: 'leveranciers',
  })
  if (!magBewerken) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('naam, email')
    .eq('id', root.vendor_id)
    .eq('wedding_id', root.wedding_id)
    .maybeSingle()
  if (!vendor?.email) {
    return NextResponse.json({ error: 'Leverancier heeft geen e-mailadres' }, { status: 400 })
  }

  const { data: members } = await supabase.rpc('list_wedding_members', { p_wedding: root.wedding_id })
  const { data: weddingRow } = await supabase
    .from('weddings')
    .select('partner1_naam, partner2_naam')
    .eq('id', root.wedding_id)
    .maybeSingle()
  const afzenderNamen =
    [weddingRow?.partner1_naam, weddingRow?.partner2_naam].filter(Boolean).join(' & ') ||
    'Een bruidspaar'

  // Zelfde reageer-link als het openingsbericht — er wordt bewust geen nieuw
  // token gegenereerd, zodat één link voor het hele gesprek blijft werken.
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  const replyUrl = siteUrl ? `${siteUrl}/reactie/${root.reply_token}` : null

  const { subject, html } = renderVendorFollowUpEmail({
    onderwerp: root.onderwerp,
    bericht: parsed.data.bericht,
    afzenderNamen,
    replyUrl,
  })
  try {
    const resend = getResend()
    const { error: sendError } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: vendor.email,
      subject,
      html,
    })
    if (sendError) {
      console.error('[berichten/reply] Resend fout:', sendError)
      return NextResponse.json({ error: 'Versturen mislukt. Probeer het opnieuw.' }, { status: 502 })
    }
  } catch (err) {
    console.error('[berichten/reply] Onverwachte fout:', err)
    return NextResponse.json({ error: 'Versturen mislukt. Probeer het opnieuw.' }, { status: 502 })
  }

  const afzenderNaam =
    (members ?? []).find((m: { user_id: string }) => m.user_id === user.id)?.display_name ||
    user.email ||
    ''
  const { data: messageRow, error: messageError } = await (supabase as any)
    .from('messages')
    .insert({
      wedding_id: root.wedding_id,
      direction: 'outbound',
      type: 'leverancier_vervolg',
      vendor_id: root.vendor_id,
      onderwerp: `Re: ${root.onderwerp}`,
      inhoud: parsed.data.bericht,
      afzender_naam: afzenderNaam,
      afzender_type: 'gebruiker',
      verzonden_door: user.id,
      status: 'verzonden',
      parent_message_id: root.id,
    })
    .select()
    .single()
  if (messageError || !messageRow) {
    console.error('[berichten/reply] Message-insert mislukt:', messageError)
    return NextResponse.json(
      { error: 'De e-mail is verstuurd, maar opslaan in het berichtencentrum is mislukt.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, message: messageFromRow(messageRow) })
}
