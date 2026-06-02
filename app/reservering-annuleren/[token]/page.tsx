'use client'

import { useState } from 'react'

export default function ReserveringAnnulerenPage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [redirectSlug, setRedirectSlug] = useState<string | null>(null)

  async function handleBevestig() {
    setStatus('loading')
    try {
      const res = await fetch('/api/registry/cancel-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      })
      if (res.ok) {
        const json = await res.json()
        setRedirectSlug(json.slug ?? null)
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Georgia, serif', background: '#f9f5f2' }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', color: '#1c1917', marginBottom: '1rem' }}>Reservering geannuleerd</h1>
          <p style={{ color: '#57534e', marginBottom: '1.5rem' }}>Je reservering is succesvol geannuleerd.</p>
          {redirectSlug && (
            <a href={`/trouwen/${redirectSlug}`} style={{ color: '#be123c' }}>Terug naar de cadeaulijst</a>
          )}
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Georgia, serif', background: '#f9f5f2' }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', color: '#1c1917', marginBottom: '1rem' }}>Annulering mislukt</h1>
          <p style={{ color: '#57534e' }}>De reservering kon niet worden geannuleerd. Mogelijk is de link al gebruikt of verlopen.</p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Georgia, serif', background: '#f9f5f2' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', color: '#1c1917', marginBottom: '1rem' }}>Reservering annuleren</h1>
        <p style={{ color: '#57534e', marginBottom: '2rem' }}>Weet je zeker dat je je reservering wilt annuleren? Dit kan niet ongedaan worden gemaakt.</p>
        <button
          onClick={handleBevestig}
          disabled={status === 'loading'}
          style={{ padding: '0.75rem 2rem', background: '#be123c', color: '#fff', border: 'none', borderRadius: 8, fontSize: '1rem', cursor: 'pointer', fontFamily: 'Georgia, serif' }}
        >
          {status === 'loading' ? 'Bezig...' : 'Ja, annuleer mijn reservering'}
        </button>
      </div>
    </main>
  )
}
