import { createHmac, timingSafeEqual } from 'crypto'
import { createRawAdminClient } from '@/lib/supabase/admin'

function verifySignature(rawBody: string, secret: string, signature: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const secret = process.env.SENTRY_WEBHOOK_SECRET

  const rawBody = await req.text()

  if (secret) {
    const signature = req.headers.get('sentry-hook-signature') ?? ''
    if (!verifySignature(rawBody, secret, signature)) {
      return new Response('Invalid signature', { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Sentry stuurt issue-alerts met action "created" (nieuwe issue) of "triggered"
  const issue = payload?.data?.issue
  if (!issue) {
    return new Response('OK', { status: 200 })
  }

  const level = (['error', 'warning', 'info'] as const).includes(issue.level)
    ? (issue.level as 'error' | 'warning' | 'info')
    : 'error'

  const supabase = createRawAdminClient()
  await supabase.from('error_logs').insert({
    level,
    message: issue.title ?? 'Onbekende Sentry-fout',
    path: issue.culprit ?? null,
    metadata: {
      source: 'sentry',
      sentry_id: issue.id,
      sentry_short_id: issue.shortId,
      sentry_permalink: issue.permalink,
      first_seen: issue.firstSeen,
      occurrences: issue.count,
      affected_users: issue.userCount,
      project: issue.project?.slug,
    },
  })

  return new Response('OK', { status: 200 })
}
