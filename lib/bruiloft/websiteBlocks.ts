// Blokkenmodel voor de publieke trouwwebsite (website v3, zie
// trouwwebsite-roadmap.md). Een pagina is een geordende lijst blokken;
// elk blok heeft een type, eigen inhoud en optionele weergave-instellingen.
// converteerOudNaarBlokken zet het oude vaste-secties-model om.

import type { FaqItem, GallerijFoto, ID, WebsiteContent, WebsiteFoto } from './types'

export type BlockUitlijning = 'links' | 'midden' | 'rechts'
// Contentbreedte van een blok: smal (leestekst), breed (standaard) of
// volledig (rand-tot-rand, bijv. voor een grote foto-achtergrond).
export type BlockBreedte = 'smal' | 'breed' | 'volledig'

export interface BlockLayout {
  uitlijning?: BlockUitlijning
  achtergrondKleur?: string        // hex; weggelaten = themakleur
  tekstKleur?: 'licht' | 'donker'  // contrast-override bij eigen achtergrond
  kopFotoUrl?: string              // afbeelding als kop boven het blok
  breedte?: BlockBreedte           // weggelaten = 'breed'
  achtergrondFotoUrl?: string      // volledige blok-achtergrond (i.p.v. kopfoto)
  achtergrondOverlay?: number      // 0..1 donkerte over de achtergrondfoto
}

interface BlockBasis {
  id: string
  zichtbaar: boolean
  layout?: BlockLayout
}

export interface HeroBlock extends BlockBasis {
  type: 'hero'
  // fullscreen = huidige gedrag (full-bleed foto, gecentreerde tekst);
  // split = foto naast tekst; typografisch = geen foto, alleen grote type.
  variant: 'fullscreen' | 'split' | 'typografisch'
  fotoUrl: string
  overlay: number      // 0..1 donkerte over de foto
  ondertitel: string   // optionele regel onder de namen
}
export interface TekstBlock extends BlockBasis {
  type: 'tekst'
  titel: string
  tekst: string
}
export interface TekstFotoBlock extends BlockBasis {
  type: 'tekstFoto'
  titel: string
  tekst: string
  fotoUrl: string
  fotoPositie: 'links' | 'rechts' | 'boven'
}
export interface QuoteBlock extends BlockBasis {
  type: 'quote'
  citaat: string
  bron: string  // bijv. "Onze trouwbelofte" of een naam
}
export interface TijdlijnMoment {
  id: string
  datum: string  // vrije tekst, bijv. "Zomer 2019" of een echte datum
  titel: string
  tekst: string
}
export interface TijdlijnBlock extends BlockBasis {
  type: 'tijdlijn'
  titel: string
  momenten: TijdlijnMoment[]
}
export interface Persoon {
  id: string
  naam: string
  rol: string  // bijv. "Getuige" of "Bruidsmeisje"
  fotoUrl: string
}
export interface PersonenBlock extends BlockBasis {
  type: 'personen'
  titel: string
  mensen: Persoon[]
}
export interface LocatieBlock extends BlockBasis {
  type: 'locatie'
  titel: string
  naam: string        // bijv. "Landgoed De Reehorst"
  adres: string
  tekst: string        // parkeertips, routebeschrijving, etc.
  kaartInsluitUrl: string  // Google Maps "insluiten"-embed-URL
}
export interface VideoBlock extends BlockBasis {
  type: 'video'
  titel: string
  videoUrl: string  // YouTube- of Vimeo-link; renderer zet dit om naar embed
}
export interface RsvpBlock extends BlockBasis {
  type: 'rsvp'
  titel: string
  introTekst: string  // korte tekst boven het zoekformulier
}
export interface ProgrammaBlock extends BlockBasis {
  type: 'programma'
  titel: string
  bron: 'draaiboek' | 'eigen'  // draaiboek = gast-items uit het draaiboek
  eigenTekst: string
}
export interface CountdownBlock extends BlockBasis {
  type: 'countdown'
  titel: string
  datum: string  // ISO-datum; '' = trouwdatum
}
export interface GalerijBlock extends BlockBasis {
  type: 'galerij'
  titel: string
  stijl: 'raster' | 'masonry'
  fotos: GallerijFoto[]
}
export interface FaqBlock extends BlockBasis {
  type: 'faq'
  titel: string
  items: FaqItem[]
}
export interface CadeaulijstBlock extends BlockBasis {
  type: 'cadeaulijst'
  titel: string
  tekst: string  // getoond wanneer de cadeaulijst-module uit staat
}
export interface ContactBlock extends BlockBasis {
  type: 'contact'
  titel: string
  tekst: string
}
export interface ScheidingBlock extends BlockBasis {
  type: 'scheiding'
}

export type Block =
  | HeroBlock
  | TekstBlock
  | TekstFotoBlock
  | QuoteBlock
  | TijdlijnBlock
  | PersonenBlock
  | LocatieBlock
  | VideoBlock
  | RsvpBlock
  | ProgrammaBlock
  | CountdownBlock
  | GalerijBlock
  | FaqBlock
  | CadeaulijstBlock
  | ContactBlock
  | ScheidingBlock

export type BlockType = Block['type']

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  hero: 'Openingsbeeld',
  tekst: 'Tekst',
  tekstFoto: 'Tekst + foto',
  quote: 'Citaat',
  tijdlijn: 'Ons verhaal',
  personen: 'Bruidsgevolg',
  locatie: 'Locatie',
  video: 'Video',
  rsvp: 'RSVP',
  programma: 'Programma',
  countdown: 'Aftelling',
  galerij: 'Fotogalerij',
  faq: 'Vraag & antwoord',
  cadeaulijst: 'Cadeaulijst',
  contact: 'Contact',
  scheiding: 'Scheiding',
}

// Types die een stel meerdere keren kan toevoegen via "Blok toevoegen".
// (hero is er precies één, bovenaan; de rest is vrij.)
export const TOEVOEGBARE_TYPES: BlockType[] = [
  'tekst',
  'tekstFoto',
  'quote',
  'tijdlijn',
  'personen',
  'locatie',
  'video',
  'rsvp',
  'programma',
  'countdown',
  'galerij',
  'faq',
  'cadeaulijst',
  'contact',
  'scheiding',
]

export function nieuwBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function maakBlock(type: BlockType): Block {
  const basis = { id: nieuwBlockId(), zichtbaar: true }
  switch (type) {
    case 'hero':        return { ...basis, type, variant: 'fullscreen', fotoUrl: '', overlay: 0.35, ondertitel: '' }
    case 'tekst':       return { ...basis, type, titel: '', tekst: '' }
    case 'tekstFoto':   return { ...basis, type, titel: '', tekst: '', fotoUrl: '', fotoPositie: 'rechts' }
    case 'quote':       return { ...basis, type, citaat: '', bron: '' }
    case 'tijdlijn':    return { ...basis, type, titel: 'Ons verhaal', momenten: [] }
    case 'personen':    return { ...basis, type, titel: 'Bruidsgevolg', mensen: [] }
    case 'locatie':     return { ...basis, type, titel: 'Locatie', naam: '', adres: '', tekst: '', kaartInsluitUrl: '' }
    case 'video':       return { ...basis, type, titel: '', videoUrl: '' }
    case 'rsvp':        return { ...basis, type, titel: 'Ben je erbij?', introTekst: 'Laat ons weten of je erbij bent.' }
    case 'programma':   return { ...basis, type, titel: 'Programma', bron: 'draaiboek', eigenTekst: '' }
    case 'countdown':   return { ...basis, type, titel: 'Aftelling', datum: '' }
    case 'galerij':     return { ...basis, type, titel: "Foto's", stijl: 'raster', fotos: [] }
    case 'faq':         return { ...basis, type, titel: 'Vraag & antwoord', items: [] }
    case 'cadeaulijst': return { ...basis, type, titel: 'Cadeaulijst', tekst: '' }
    case 'contact':     return { ...basis, type, titel: 'Contact', tekst: '' }
    case 'scheiding':   return { ...basis, type }
  }
}

// Heeft dit blok genoeg inhoud om publiek te tonen? De hero en scheiding
// tonen altijd; programma met draaiboek-bron hangt van het schedule af en
// beslist de renderer zelf.
export function heeftInhoud(b: Block): boolean {
  switch (b.type) {
    case 'hero':
    case 'scheiding':
    case 'countdown':
    case 'programma':
    case 'cadeaulijst':
    case 'rsvp':
      return true
    case 'tekst':
    case 'contact':
      return b.tekst.trim().length > 0
    case 'tekstFoto':
      return b.tekst.trim().length > 0 || !!b.fotoUrl
    case 'quote':
      return b.citaat.trim().length > 0
    case 'tijdlijn':
      return b.momenten.length > 0
    case 'personen':
      return b.mensen.length > 0
    case 'locatie':
      return !!(b.naam.trim() || b.adres.trim() || b.tekst.trim() || b.kaartInsluitUrl.trim())
    case 'video':
      return b.videoUrl.trim().length > 0
    case 'galerij':
      return b.fotos.length > 0
    case 'faq':
      return b.items.length > 0
  }
}

// --- Pagina's ---------------------------------------------------------

export interface WebsitePage {
  id: ID
  weddingId: ID
  titel: string
  pageSlug: string  // '' = homepagina
  volgorde: number
  zichtbaar: boolean
  blocks: Block[]
}

export type WebsitePageInput = Omit<WebsitePage, 'id'>

// --- Converter: oud secties-model → blokken ----------------------------

// Volgorde-fallback zoals de oude publieke renderer die hanteerde.
const OUDE_VOLGORDE: Record<string, number> = {
  welkom: 0, programma: 1, countdown: 2, dresscode: 3, cadeaulijst: 4,
  hotels: 5, routebeschrijving: 6, faq: 7, fotos: 8, contact: 9,
}

// In het oude model heette de welkom-sectie 'home' in de editor-config.
const cfgSleutel = (id: string) => (id === 'welkom' ? 'home' : id)

// Idempotente omzetting van het oude vaste-secties-model naar één lijst
// blokken voor de Home-pagina. websiteFotos vangt het geval waar galerij-
// foto's alleen in de website_fotos-tabel staan (en niet in het
// gallerij-jsonb-veld dat de oude publieke site las).
export function converteerOudNaarBlokken(
  content: WebsiteContent,
  websiteFotos: WebsiteFoto[] = []
): Block[] {
  const config = content.sectiesConfig ?? {}

  const layoutVan = (sleutel: string): BlockLayout | undefined => {
    const cfg = config[cfgSleutel(sleutel)]
    if (!cfg) return undefined
    const layout: BlockLayout = {}
    if (cfg.uitlijning) layout.uitlijning = cfg.uitlijning
    if (cfg.achtergrondKleur && cfg.achtergrondKleur !== 'transparant') {
      layout.achtergrondKleur = cfg.achtergrondKleur
      if (cfg.tekstKleur) layout.tekstKleur = cfg.tekstKleur
    }
    if (cfg.fotoUrl) layout.kopFotoUrl = cfg.fotoUrl
    return Object.keys(layout).length > 0 ? layout : undefined
  }

  const zichtbaarVan = (sleutel: string): boolean => {
    const cfg = config[cfgSleutel(sleutel)]
    // Countdown was opt-in in het oude model: zonder config verborgen.
    if (sleutel === 'countdown' && cfg === undefined) return false
    return cfg?.zichtbaar !== false
  }

  const naamVan = (sleutel: string, standaard: string): string =>
    config[cfgSleutel(sleutel)]?.naam || standaard

  const galerijFotos: GallerijFoto[] =
    content.gallerij.length > 0
      ? content.gallerij
      : websiteFotos.map((f) => ({ id: f.id, url: f.url, bijschrift: f.bijschrift }))

  const sectieBlokken: { sleutel: string; block: Block }[] = [
    {
      sleutel: 'welkom',
      block: {
        id: nieuwBlockId(), type: 'tekst', zichtbaar: zichtbaarVan('welkom'),
        titel: naamVan('welkom', 'Welkom'), tekst: content.welkomsttekst,
        layout: layoutVan('welkom'),
      },
    },
    {
      sleutel: 'programma',
      block: {
        id: nieuwBlockId(), type: 'programma', zichtbaar: zichtbaarVan('programma'),
        titel: naamVan('programma', 'Programma'),
        bron: config['programma']?.inhoud ? 'eigen' : 'draaiboek',
        eigenTekst: config['programma']?.inhoud ?? '',
        layout: layoutVan('programma'),
      },
    },
    {
      sleutel: 'countdown',
      block: {
        id: nieuwBlockId(), type: 'countdown', zichtbaar: zichtbaarVan('countdown'),
        titel: naamVan('countdown', 'Aftelling'),
        datum: config['countdown']?.countdownDatum ?? '',
        layout: layoutVan('countdown'),
      },
    },
    {
      sleutel: 'dresscode',
      block: {
        id: nieuwBlockId(), type: 'tekst', zichtbaar: zichtbaarVan('dresscode'),
        titel: naamVan('dresscode', 'Dresscode'), tekst: content.dresscode,
        layout: layoutVan('dresscode'),
      },
    },
    {
      sleutel: 'cadeaulijst',
      block: {
        id: nieuwBlockId(), type: 'cadeaulijst', zichtbaar: zichtbaarVan('cadeaulijst'),
        titel: naamVan('cadeaulijst', 'Cadeaulijst'), tekst: content.cadeaulijst,
        layout: layoutVan('cadeaulijst'),
      },
    },
    {
      sleutel: 'hotels',
      block: {
        id: nieuwBlockId(), type: 'tekst', zichtbaar: zichtbaarVan('hotels'),
        titel: naamVan('hotels', 'Overnachten'), tekst: content.hotels,
        layout: layoutVan('hotels'),
      },
    },
    {
      sleutel: 'routebeschrijving',
      block: {
        id: nieuwBlockId(), type: 'tekst', zichtbaar: zichtbaarVan('routebeschrijving'),
        titel: naamVan('routebeschrijving', 'Route'), tekst: content.routebeschrijving,
        layout: layoutVan('routebeschrijving'),
      },
    },
    {
      sleutel: 'faq',
      block: {
        id: nieuwBlockId(), type: 'faq', zichtbaar: zichtbaarVan('faq'),
        titel: naamVan('faq', 'FAQ'), items: content.faq,
        layout: layoutVan('faq'),
      },
    },
    {
      sleutel: 'fotos',
      block: {
        id: nieuwBlockId(), type: 'galerij', zichtbaar: zichtbaarVan('fotos'),
        titel: naamVan('fotos', "Foto's"),
        stijl: content.thema === 'modern' || content.thema === 'botanisch' ? 'masonry' : 'raster',
        fotos: galerijFotos,
        layout: layoutVan('fotos'),
      },
    },
    {
      sleutel: 'contact',
      block: {
        id: nieuwBlockId(), type: 'contact', zichtbaar: zichtbaarVan('contact'),
        titel: naamVan('contact', 'Contact'), tekst: content.contact,
        layout: layoutVan('contact'),
      },
    },
  ]

  sectieBlokken.sort((a, b) => {
    const va = config[cfgSleutel(a.sleutel)]?.volgorde ?? OUDE_VOLGORDE[a.sleutel] ?? 99
    const vb = config[cfgSleutel(b.sleutel)]?.volgorde ?? OUDE_VOLGORDE[b.sleutel] ?? 99
    return va - vb
  })

  const hero: HeroBlock = {
    id: nieuwBlockId(), type: 'hero', zichtbaar: true, variant: 'fullscreen',
    fotoUrl: content.headerFotoUrl, overlay: content.headerOverlay ?? 0.35, ondertitel: '',
  }

  return [hero, ...sectieBlokken.map((s) => s.block)]
}
