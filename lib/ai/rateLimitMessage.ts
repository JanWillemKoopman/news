import 'server-only'

// Rondt altijd naar boven af zodat "0 minuten" nooit getoond wordt vlak voor het verstrijken van de cooldown.
export function minutenTotReset(resetAt: Date): number {
  return Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 60000))
}

export function teVeelVerzoekenBericht(resetAt: Date): string {
  const min = minutenTotReset(resetAt)
  return `Te veel verzoeken. Probeer het over ${min} ${min === 1 ? 'minuut' : 'minuten'} opnieuw.`
}
