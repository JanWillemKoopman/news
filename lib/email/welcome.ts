import 'server-only'

import { FROM_ADDRESS, getResend } from '@/lib/email/resend'
import { renderWelcomeEmail } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'

// Verstuurt de welkomst-/bevestigingsmail precies één keer per account,
// zodra het account compleet is (e-mail bevestigd of wachtwoord ingesteld).
// Idempotent via de user_metadata-vlag `welkomstmail_verzonden` — aanroepen
// vanaf meerdere plekken (signup-bevestiging, wachtwoord instellen na een
// uitnodiging) kan dus geen dubbele mail opleveren.
export async function sendWelcomeEmailOnce(
  userId: string,
  opts: {
    // true: alleen versturen aan accounts die via een uitnodiging zijn
    // aangemaakt (metadata-vlag `uitgenodigd`). Zo krijgt een bestaand account
    // dat gewoon zijn wachtwoord reset niet alsnog een "welkom"-mail.
    onlyIfInvited?: boolean
  } = {}
): Promise<void> {
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.getUserById(userId)
  const user = data?.user
  if (error || !user?.email) return
  if (user.user_metadata?.welkomstmail_verzonden) return
  if (opts.onlyIfInvited && user.user_metadata?.uitgenodigd !== true) return

  const naam =
    (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name) ||
    user.email.split('@')[0]
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  const { subject, html } = renderWelcomeEmail({ naam, dashboardUrl: `${siteUrl}/bruiloft` })

  const resend = getResend()
  const { error: sendError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: user.email,
    subject,
    html,
  })
  if (sendError) {
    console.error('[welcome] Resend fout:', sendError)
    return
  }

  // Pas na een geslaagde verzending markeren, anders krijgt de gebruiker
  // de mail nooit als de eerste poging faalt.
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...user.user_metadata, welkomstmail_verzonden: true },
  })
}
