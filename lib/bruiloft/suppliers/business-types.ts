// Typeringen voor de businesses-tabel — de schone leveranciersdirectory met
// uitsluitend feitelijke bedrijfsgegevens (naam, categorie, adres, contact,
// geo) en een eigen omschrijving. De rij wordt gemapt naar het bestaande
// Supplier-type zodat alle bestaande UI-componenten (SupplierCard,
// SupplierDetailModal, etc.) blijven werken.

import type { Supplier } from './types'

// Ruwe rij zoals Supabase deze teruggeeft (exacte kolomnamen van businesses).
export interface BusinessRow {
  id: string
  naam: string | null
  categorie: string | null
  straat: string | null
  postcode: string | null
  plaats: string | null
  provincie: string | null
  land: string | null
  lat: number | string | null
  lon: number | string | null
  telefoon: string | null
  email: string | null
  website: string | null
  omschrijving: string | null
}

const str = (v: string | null | undefined): string => v ?? ''
const numOrNull = (v: number | string | null | undefined): number | null =>
  v == null || v === '' ? null : Number(v)

// Converteert een businesses-rij naar het Supplier-domeintype. Velden die de
// directory bewust niet kent (prijs, capaciteit, foto's, tags) blijven leeg.
export function mapBusinessRow(row: BusinessRow): Supplier {
  return {
    id: row.id,
    externalId: row.id,
    bron: 'businesses',
    categorie: str(row.categorie) || 'overig',
    naam: str(row.naam),
    type: '',
    omschrijvingKort: str(row.omschrijving),
    straat: str(row.straat),
    huisnummer: '',
    postcode: str(row.postcode),
    plaats: str(row.plaats),
    provincie: str(row.provincie),
    latitude: numOrNull(row.lat),
    longitude: numOrNull(row.lon),
    capaciteitMin: 0,
    capaciteitMax: 0,
    buitenTrouwen: false,
    overnachtingMogelijk: false,
    prijsVanaf: null,
    prijsTot: null,
    prijsIndicatieTekst: '',
    isPrijsOpAanvraag: true,
    website: str(row.website),
    email: str(row.email),
    telefoon: str(row.telefoon),
    afbeeldingUrl: '',
    tags: [],
    aiContextTekst: str(row.omschrijving),
  }
}
