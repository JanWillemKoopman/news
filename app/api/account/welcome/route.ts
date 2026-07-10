import { NextResponse } from 'next/server'

import { sendWelcomeEmailOnce } from '@/lib/email/welcome'
import { createClient } from '@/lib/supabase/server'

// Wordt (fire-and-forget) aangeroepen zodra een uitgenodigd lid zijn
// wachtwoord heeft ingesteld en het account daarmee compleet is. De helper
// is idempotent: de bevestigingsmail gaat per account maximaal één keer uit.
export async function POST() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  try {
    await sendWelcomeEmailOnce(user.id, { onlyIfInvited: true })
  } catch (err) {
    // De welkomstmail is best-effort; het instellen van het wachtwoord is al
    // gelukt, dus dit mag de flow nooit laten falen.
    console.error('[account/welcome] Onverwachte fout:', err)
  }

  return NextResponse.json({ ok: true })
}
