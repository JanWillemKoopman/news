import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createRawAdminClient } from '@/lib/supabase/admin'
import { SUPPLIER_TABLE_CATEGORIEEN } from '@/lib/bruiloft/suppliers/types'

// Zet een handmatig door een stel toegevoegde vendor (public.vendors) over
// naar de landelijke catalogus (public.suppliers), zodat andere stellen 'm
// ook kunnen ontdekken. public.suppliers heeft bewust geen insert-policy voor
// authenticated (zie 0021_suppliers.sql) — daarom via de service-role-client,
// met een expliciete platform_admin-check vooraf (die client omzeilt RLS).

const bodySchema = z.object({
  vendorId: z.string().uuid(),
  categorie: z.enum(SUPPLIER_TABLE_CATEGORIEEN),
})

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.app_role !== 'platform_admin') {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }
  const { vendorId, categorie } = parsed.data

  const admin = createRawAdminClient()

  const { data: vendor, error: vendorError } = await admin
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .maybeSingle()
  if (vendorError || !vendor) {
    return NextResponse.json({ error: 'Leverancier niet gevonden' }, { status: 404 })
  }
  if (vendor.supplier_id) {
    return NextResponse.json({ error: 'Deze leverancier staat al in de catalogus' }, { status: 409 })
  }

  const { data: supplier, error: insertError } = await admin
    .from('suppliers')
    .insert({
      external_id: vendor.id,
      bron: 'admin_promoted',
      categorie,
      naam: vendor.naam,
      type: vendor.type,
      straat: vendor.adres ?? '',
      website: vendor.website ?? '',
      email: vendor.email ?? '',
      telefoon: vendor.telefoon ?? '',
      is_prijs_op_aanvraag: true,
    })
    .select('id')
    .single()

  if (insertError || !supplier) {
    return NextResponse.json({ error: 'Aanmaken in catalogus mislukt' }, { status: 500 })
  }

  await admin.from('vendors').update({ supplier_id: supplier.id }).eq('id', vendorId)

  return NextResponse.json({ ok: true, supplierId: supplier.id })
}
