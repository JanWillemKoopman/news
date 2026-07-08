'use client'

import * as React from 'react'

// Ontgrendelt een wachtwoord-beveiligde publieke trouwwebsite automatisch
// voor een gast die via zijn persoonlijke RSVP-link binnenkomt (zie
// app/api/rsvp/auto-unlock/route.ts + get_rsvp_unlock_meta): het rsvp_token
// identificeert de gast al betrouwbaar, dus hoeft die geen apart
// sitewachtwoord meer in te typen — ook niet als hij later los naar
// /trouwen/{slug} navigeert. No-op als de site geen wachtwoord vereist.
// Rendert niets zichtbaars; mislukken is stil (dan verschijnt hooguit
// alsnog het wachtwoordscherm bij een latere, aparte bezoek).
export function AutoUnlock({ token }: { token: string }) {
  React.useEffect(() => {
    fetch('/api/rsvp/auto-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})
  }, [token])

  return null
}
