// Deterministische conceptberichten voor offerte-/contactaanvragen aan een
// leverancier. Bewust géén 'server-only' import: de client gebruikt
// bouwContactTemplate() om de Contact-modal instant te vullen (geen wachttijd),
// en de server (app/api/ai/leverancier-bericht) gebruikt beide als fallback
// wanneer Gemini niet beschikbaar is of faalt. Zo staat de Nederlandse
// brontekst maar op één plek.

import { formatDatumNL } from '../format'
import type { Wedding } from '../types'

export interface LeverancierSnapshot {
  naam: string
  categorie: string
}

export interface BerichtConcept {
  onderwerp: string
  bericht: string
}

function partnersVolzin(wedding: Wedding): string {
  if (wedding.partner1Naam && wedding.partner2Naam) return `${wedding.partner1Naam} en ${wedding.partner2Naam}`
  return wedding.partner1Naam || wedding.partner2Naam || 'ons bruidspaar'
}

function partnersKort(wedding: Wedding): string {
  if (wedding.partner1Naam && wedding.partner2Naam) return `${wedding.partner1Naam} & ${wedding.partner2Naam}`
  return wedding.partner1Naam || wedding.partner2Naam || 'Het bruidspaar'
}

function intro(wedding: Wedding): string {
  const datum = wedding.trouwdatum ? ` op ${formatDatumNL(wedding.trouwdatum)}` : ''
  return `Wij zijn ${partnersVolzin(wedding)} en gaan trouwen${datum}.`
}

function ondertekening(wedding: Wedding): string {
  return `Met vriendelijke groet,\n${partnersKort(wedding)}`
}

export function bouwOfferteTemplate(wedding: Wedding, vendor: LeverancierSnapshot): BerichtConcept {
  const gasten = Math.max(wedding.aantalDaggasten, wedding.aantalAvondgasten)
  const gastenZin = gasten > 0 ? ` met ongeveer ${gasten} gasten` : ''
  const categorieZin = vendor.categorie
    ? `een geschikte optie voor ${vendor.categorie.toLowerCase()}`
    : 'een geschikte leverancier'

  const bericht = [
    `Beste ${vendor.naam || 'daar'},`,
    '',
    `${intro(wedding)} We zijn op zoek naar ${categorieZin} voor onze bruiloft${gastenZin}.`,
    '',
    'Zouden jullie ons een vrijblijvende offerte kunnen sturen? We horen graag wat de mogelijkheden en prijzen zijn.',
    '',
    'Alvast bedankt voor de moeite!',
    '',
    ondertekening(wedding),
  ].join('\n')

  return { onderwerp: `Offerteaanvraag — ${partnersKort(wedding)}`, bericht }
}

export function bouwContactTemplate(
  wedding: Wedding,
  vendor: LeverancierSnapshot,
  vraag?: string
): BerichtConcept {
  const vraagRegel = vraag?.trim() ? vraag.trim() : '[Typ hier jullie vraag]'

  const bericht = [
    `Beste ${vendor.naam || 'daar'},`,
    '',
    intro(wedding),
    '',
    vraagRegel,
    '',
    'Alvast bedankt voor de reactie!',
    '',
    ondertekening(wedding),
  ].join('\n')

  return { onderwerp: `Vraag over ${vendor.naam || 'jullie diensten'} — ${partnersKort(wedding)}`, bericht }
}
