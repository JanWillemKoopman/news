// Typeringen voor de tpw_businesses tabel — de nieuwe leveranciersdirectory
// met 20 categorieën. De rij wordt gemapt naar het bestaande Supplier-type
// zodat alle bestaande UI-componenten (SupplierCard, SupplierDetailModal, etc.)
// zonder wijzigingen werken.

import type { Supplier } from './types'

// Ruwe rij zoals Supabase deze teruggeeft (exacte kolomnamen van tpw_businesses).
export interface TpwBusinessRow {
  tpw_id: number
  naam: string | null
  slug: string | null
  categorie: string | null
  bedrijf_status: string | null
  plan_id: number | null
  is_cps: boolean | null
  webshop: boolean | null
  brochures_count: number | null
  detail_url: string | null
  website: string | null
  telefoon: string | null
  email: string | null
  straat: string | null
  postcode: string | null
  plaats: string | null
  provincie: string | null
  land: string | null
  lat: number | string | null
  lon: number | string | null
  landelijk_actief: boolean | null
  rating_gemiddeld: number | string | null
  rating_percentage: number | string | null
  rating_aantal: number | null
  rating_q1_info: number | string | null
  rating_q2_communicatie: number | string | null
  rating_q3_behulpzaam: number | string | null
  rating_q4_flexibiliteit: number | string | null
  rating_q5_wensen: number | string | null
  rating_q6_prijs_kwaliteit: number | string | null
  tags: string | null
  aantal_tags: number | null
  header_image: string | null
  aantal_fotos: number | null
  video_url: string | null
  video_source: string | null
  beschrijving: string | null
  seo_omschrijving: string | null
  tpw_created_at: string | null
  tpw_updated_at: string | null
  gem_bruiloft_prijs: number | string | null
  prijspakket_vanaf: number | string | null
  aantal_prijspakketten: number | null
  prijspakket_max: number | string | null
  prijspakketten_namen: string | null
  prijsindicatoren: string | null
  merken: string | null
  aantal_reviews: number | null
  json_tags: unknown | null
  json_fotos: unknown | null
  json_prijsindicatoren: unknown | null
  json_prijspakketten: unknown | null
  json_merken: unknown | null
  json_openingstijden: unknown | null
  json_reviews: unknown | null
  avg_ceremonie: number | string | null
  avg_receptie: number | string | null
  avg_feest: number | string | null
  avg_diner: number | string | null
  avg_overnachting: number | string | null
  cap_ceremonie: number | null
  cap_receptie: number | null
  cap_feest: number | null
  cap_diner: number | null
  aantal_zalen: number | null
  max_gasten_ceremonie: number | null
  max_gasten_receptie: number | null
  max_gasten_feest: number | null
  aantal_hotelkamers: string | null
  sluitingstijd: string | null
  muziek_toegestaan: string | null
  eigen_catering: string | null
  json_zalen: unknown | null
  json_meta_tags: unknown | null
  scraped_at: string | null
  scrape_updated_at: string | null
}

const str = (v: string | null | undefined): string => v ?? ''
const numOrNull = (v: number | string | null | undefined): number | null =>
  v == null || v === '' ? null : Number(v)

function maxCapaciteit(row: TpwBusinessRow): number {
  const waarden = [
    row.max_gasten_feest,
    row.max_gasten_receptie,
    row.max_gasten_ceremonie,
    row.cap_feest,
    row.cap_receptie,
    row.cap_ceremonie,
    row.cap_diner,
  ]
  return Math.max(0, ...waarden.filter((v): v is number => v != null && v > 0))
}

function parseFotoUrls(json: unknown): string[] {
  if (!Array.isArray(json)) return []
  return json
    .map((item: unknown) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        return str((obj.url ?? obj.src ?? obj.image_url ?? '') as string)
      }
      return ''
    })
    .filter(Boolean)
}

function parseTags(jsonTags: unknown, textTags: string | null): string[] {
  if (Array.isArray(jsonTags)) {
    return jsonTags
      .map((t: unknown) =>
        typeof t === 'string' ? t : ((t as Record<string, unknown>)?.naam as string) ?? ''
      )
      .filter(Boolean)
  }
  if (textTags) return textTags.split(',').map((t) => t.trim()).filter(Boolean)
  return []
}

// Converteert een tpw_businesses-rij naar het Supplier-domeintype dat door
// alle bestaande componenten wordt verwacht. tpw_id (integer) wordt als
// string opgeslagen zodat het consistent is met ID = string.
export function mapTpwBusinessRow(row: TpwBusinessRow): Supplier {
  const prijsVanaf = numOrNull(row.prijspakket_vanaf ?? row.gem_bruiloft_prijs)
  const prijsTot = numOrNull(row.prijspakket_max)
  const cap = maxCapaciteit(row)
  const fotos = parseFotoUrls(row.json_fotos)
  const tags = parseTags(row.json_tags, row.tags)
  const rating = numOrNull(row.rating_gemiddeld)
  const ratingAantal = row.rating_aantal ?? 0

  return {
    id: String(row.tpw_id),
    externalId: str(row.slug) || String(row.tpw_id),
    bron: 'tpw_businesses',
    categorie: str(row.categorie) || 'overig',
    naam: str(row.naam),
    type: '',
    omschrijvingKort: str(row.seo_omschrijving || row.beschrijving),
    straat: str(row.straat),
    huisnummer: '',
    postcode: str(row.postcode),
    plaats: str(row.plaats),
    provincie: str(row.provincie),
    latitude: numOrNull(row.lat),
    longitude: numOrNull(row.lon),
    capaciteitMin: 0,
    capaciteitMax: cap,
    buitenTrouwen: false,
    overnachtingMogelijk: row.avg_overnachting != null && Number(row.avg_overnachting) > 0,
    prijsVanaf,
    prijsTot,
    prijsIndicatieTekst: '',
    isPrijsOpAanvraag: prijsVanaf == null,
    website: str(row.website),
    email: str(row.email),
    telefoon: str(row.telefoon),
    afbeeldingUrl: str(row.header_image),
    tags,
    aiContextTekst: [
      str(row.beschrijving),
      rating != null && ratingAantal > 0
        ? `Beoordeling: ${rating.toFixed(1)}/10 op basis van ${ratingAantal} reviews.`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
    ratingGemiddeld: rating ?? undefined,
    ratingAantal: ratingAantal > 0 ? ratingAantal : undefined,
    fotos: fotos.length > 0 ? fotos : undefined,
  }
}
