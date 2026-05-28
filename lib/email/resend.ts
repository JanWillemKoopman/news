import 'server-only'

import { Resend } from 'resend'

let _client: Resend | null = null

export function getResend(): Resend {
  if (!_client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is niet ingesteld')
    }
    _client = new Resend(process.env.RESEND_API_KEY)
  }
  return _client
}

// Gebruik eigen domein zodra dat geverifieerd is in het Resend-dashboard.
export const FROM_ADDRESS = 'Ons Trouwplan <onboarding@resend.dev>'
