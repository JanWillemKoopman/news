import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Alleen de eerste letter als hoofdletter ("offerte aangevraagd" → "Offerte
// aangevraagd"). Vervangt de CSS-class `capitalize`, die élk woord een
// hoofdletter gaf ("Offerte Aangevraagd") — geen correct Nederlands.
export function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
