// Typeringen voor de tpw_businesses tabel — de nieuwe leveranciersdirectory
// met 20 categorieën. De rij wordt gemapt naar het bestaande Supplier-type
// zodat alle bestaande UI-componenten (SupplierCard, SupplierDetailModal, etc.)
// zonder wijzigingen werken.
//
// KOLOMNAMEN: de exacte namen zijn afgeleid van gangbare patronen. Pas
// TpwBusinessRow aan als de werkelijke kolomnamen afwijken.

import type { Supplier } from './types'

// Ruwe rij zoals Supabase deze teruggeeft (snake_case).
export interface TpwBusinessRow {
  id: string
  naam: string | null
  categorie: string | null
  slug: string | null
  omschrijving: string | null
  omschrijving_kort: string | null
  foto_url: string | null
  // Sommige tabellen gebruiken 'afbeelding_url' i.p.v. 'foto_url'
  afbeelding_url?: string | null
  fotos: string[] | null
  website: string | null
  email: string | null
  telefoon: string | null
  straat: string | null
  huisnummer: string | null
  postcode: string | null
  plaats: string | null
  stad?: string | null
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
  tags: string[] | null
  ai_context_tekst: string | null
  created_at: string | null
  updated_at: string | null
}

const str = (v: string | null | undefined): string => v ?? ''
const numOrNull = (v: number | string | null | undefined): number | null =>
  v == null || v === '' ? null : Number(v)
const intVal = (v: number | null | undefined): number => (v == null ? 0 : Number(v))

// Converteert een tpw_businesses-rij naar het Supplier-domeintype dat door
// alle bestaande componenten wordt verwacht.
export function mapTpwBusinessRow(row: TpwBusinessRow): Supplier {
  const fotoUrl = str(row.foto_url || row.afbeelding_url)
  const plaats = str(row.plaats || row.stad)
  return {
    id: row.id,
    externalId: row.slug ?? row.id,
    bron: 'tpw_businesses',
    categorie: str(row.categorie) || 'overig',
    naam: str(row.naam),
    // 'type' gebruiken we voor de ondertitel in de kaart; valt terug op categorie
    type: '',
    omschrijvingKort: str(row.omschrijving_kort || row.omschrijving),
    straat: str(row.straat),
    huisnummer: str(row.huisnummer),
    postcode: str(row.postcode),
    plaats,
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
    afbeeldingUrl: fotoUrl,
    tags: row.tags ?? [],
    aiContextTekst: str(row.ai_context_tekst || row.omschrijving),
  }
}
