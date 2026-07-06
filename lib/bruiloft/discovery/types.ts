// Typen voor /bruiloft/ontdekken — de leveranciersdirectory op basis van
// tpw_businesses. Bewust een smal, eigen type (géén hergebruik van het brede
// Supplier-type): deze fase gebruikt uitsluitend de basiskolommen
// naam/categorie/adres/coördinaten/beschrijving/contact. Ratings, prijzen,
// foto's en capaciteit volgen later als per-categorie filters en worden hier
// dan bewust aan toegevoegd.

import type { Vendor } from '../types'
import { normaliseerWebsite } from '../suppliers/linked'

// Kolommen die de zoek-API selecteert — één bron van waarheid, zodat er
// nergens per ongeluk extra kolommen meekomen.
export const ONTDEK_KOLOMMEN =
  'tpw_id,naam,categorie,straat,postcode,plaats,provincie,lat,lon,beschrijving,website,telefoon,email,header_image'

// Ruwe rij zoals Supabase die teruggeeft voor bovenstaande selectie.
export interface OntdekRow {
  tpw_id: number
  naam: string | null
  categorie: string | null
  straat: string | null
  postcode: string | null
  plaats: string | null
  provincie: string | null
  lat: number | string | null
  lon: number | string | null
  beschrijving: string | null
  website: string | null
  telefoon: string | null
  email: string | null
  header_image: string | null
}

// Wat de UI per leverancier nodig heeft. afstandKm is alleen gevuld wanneer
// er op een plaats (met coördinaten) gezocht is.
export interface OntdekBusiness {
  id: string // tpw_id als string (consistent met vendors.tpwBusinessId)
  naam: string
  categorie: string
  straat: string
  postcode: string
  plaats: string
  provincie: string
  lat: number | null
  lon: number | null
  beschrijving: string
  website: string
  telefoon: string
  email: string
  afbeeldingUrl: string
  afstandKm: number | null
}

export interface OntdekZoekResultaat {
  items: OntdekBusiness[]
  totaal: number
  page: number
  limit: number
}

const str = (v: string | null | undefined): string => (v ?? '').trim()
const numOrNull = (v: number | string | null | undefined): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function mapOntdekRow(row: OntdekRow, afstand: number | null = null): OntdekBusiness {
  return {
    id: String(row.tpw_id),
    naam: str(row.naam),
    categorie: str(row.categorie),
    straat: str(row.straat),
    postcode: str(row.postcode),
    plaats: str(row.plaats),
    provincie: str(row.provincie),
    lat: numOrNull(row.lat),
    lon: numOrNull(row.lon),
    beschrijving: str(row.beschrijving),
    website: str(row.website),
    telefoon: str(row.telefoon),
    email: str(row.email),
    afbeeldingUrl: str(row.header_image),
    afstandKm: afstand,
  }
}

// Staat deze leverancier al in Mijn lijst? Primair via de tpw-koppeling;
// legacy-rijen (toegevoegd vóór die koppeling) herkennen we aan de website.
export function isInMijnLijst(business: OntdekBusiness, vendors: Vendor[]): boolean {
  if (vendors.some((v) => v.tpwBusinessId === business.id)) return true
  const site = normaliseerWebsite(business.website)
  if (!site) return false
  return vendors.some((v) => v.website && normaliseerWebsite(v.website) === site)
}

// Een gekozen zoekplaats (uit de PDOK Locatieserver): naam voor weergave,
// gemeente/provincie voor context in de suggestielijst, lat/lon als anker.
export interface ZoekPlaats {
  naam: string
  gemeente: string
  provincie: string
  lat: number
  lon: number
}
