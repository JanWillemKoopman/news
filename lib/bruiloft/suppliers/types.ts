// Domeintype voor de globale leveranciersdirectory (tabel public.suppliers).
// Los gehouden van lib/bruiloft/types.ts omdat suppliers NIET aan één wedding
// hangen: het is een gedeelde catalogus.

import type { VendorType } from '../types'

// `categorie` hergebruikt de VendorType-enum zodat budget-matching en de
// "Toevoegen aan mijn leveranciers"-knop naadloos aansluiten op public.vendors.
export type SupplierCategorie = VendorType

export interface Supplier {
  id: string
  externalId: string
  bron: string
  categorie: SupplierCategorie
  naam: string
  type: string // vrije sub-type-tekst uit de CSV (Kasteel, Boerderij, ...)
  omschrijvingKort: string
  straat: string
  huisnummer: string
  postcode: string
  plaats: string
  provincie: string
  latitude: number | null
  longitude: number | null
  capaciteitMin: number
  capaciteitMax: number
  buitenTrouwen: boolean
  overnachtingMogelijk: boolean
  prijsVanaf: number | null
  prijsTot: number | null
  prijsIndicatieTekst: string
  isPrijsOpAanvraag: boolean
  website: string
  email: string
  telefoon: string
  afbeeldingUrl: string
  tags: string[]
  aiContextTekst: string
}

// Ruwe rij zoals die uit Supabase komt (snake_case). Untyped tabel (nog niet in
// database.types.ts), dus we typen 'm hier expliciet.
export interface SupplierRow {
  id: string
  external_id: string
  bron: string | null
  categorie: string
  naam: string | null
  type: string | null
  omschrijving_kort: string | null
  straat: string | null
  huisnummer: string | null
  postcode: string | null
  plaats: string | null
  provincie: string | null
  latitude: number | string | null
  longitude: number | string | null
  capaciteit_min: number | null
  capaciteit_max: number | null
  buiten_trouwen: boolean | null
  overnachting_mogelijk: boolean | null
  prijs_vanaf: number | string | null
  prijs_tot: number | string | null
  prijs_indicatie_tekst: string | null
  is_prijs_op_aanvraag: boolean | null
  website: string | null
  email: string | null
  telefoon: string | null
  afbeelding_url: string | null
  tags: string[] | null
  ai_context_tekst: string | null
}

const str = (v: string | null | undefined): string => v ?? ''
const numOrNull = (v: number | string | null | undefined): number | null =>
  v == null || v === '' ? null : Number(v)
const intVal = (v: number | null | undefined): number => (v == null ? 0 : Number(v))

export function mapSupplierRow(row: SupplierRow): Supplier {
  return {
    id: row.id,
    externalId: str(row.external_id),
    bron: str(row.bron),
    categorie: (row.categorie as SupplierCategorie) ?? 'overig',
    naam: str(row.naam),
    type: str(row.type),
    omschrijvingKort: str(row.omschrijving_kort),
    straat: str(row.straat),
    huisnummer: str(row.huisnummer),
    postcode: str(row.postcode),
    plaats: str(row.plaats),
    provincie: str(row.provincie),
    latitude: numOrNull(row.latitude),
    longitude: numOrNull(row.longitude),
    capaciteitMin: intVal(row.capaciteit_min),
    capaciteitMax: intVal(row.capaciteit_max),
    buitenTrouwen: Boolean(row.buiten_trouwen),
    overnachtingMogelijk: Boolean(row.overnachting_mogelijk),
    prijsVanaf: numOrNull(row.prijs_vanaf),
    prijsTot: numOrNull(row.prijs_tot),
    prijsIndicatieTekst: str(row.prijs_indicatie_tekst),
    isPrijsOpAanvraag: Boolean(row.is_prijs_op_aanvraag),
    website: str(row.website),
    email: str(row.email),
    telefoon: str(row.telefoon),
    afbeeldingUrl: str(row.afbeelding_url),
    tags: row.tags ?? [],
    aiContextTekst: str(row.ai_context_tekst),
  }
}
