// Vertaalt Supabase-auth-foutmeldingen naar begrijpelijke Nederlandse tekst.
export function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Onjuist e-mailadres of wachtwoord.'
  if (m.includes('email not confirmed')) return 'Bevestig eerst je e-mailadres via de link in je inbox.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Er bestaat al een account met dit e-mailadres.'
  if (m.includes('password should be at least') || m.includes('weak password'))
    return 'Wachtwoord is te zwak (gebruik minimaal 6 tekens).'
  if (m.includes('rate limit') || m.includes('too many requests'))
    return 'Te veel pogingen. Wacht even en probeer het opnieuw.'
  if (m.includes('same password'))
    return 'Kies een ander wachtwoord dan je huidige.'
  return 'Er ging iets mis. Probeer het opnieuw.'
}

// Voorkomt open-redirects: alleen interne paden toestaan.
export function safeNext(next: string | undefined, fallback = '/bruiloft'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback
  return next
}
