// Per-categorie configuratie voor /bruiloft/ontdekken. De categorieën lopen
// inhoudelijk sterk uiteen (een trouwlocatie kies je anders dan een
// trouwambtenaar), dus elke categorie krijgt hier zijn eigen instellingen.
// Wat alle categorieën delen: de geografische zoekbalk (plaats + straal).
//
// `filters` is de plug-in-plek voor categoriespecifieke filters (prijs,
// capaciteit, stijl, ...). Die data zit al in tpw_businesses maar is bewust
// nog niet ontsloten — zodra we per categorie bepaald hebben wélke filters
// waardevol zijn, worden ze hier gedeclareerd en pakt de filterkolom ze
// automatisch op.

import { TPW_CATEGORIEEN, tpwCategorieNaarSlug, type TpwCategorie } from '../options'

// Toekomstige categoriefilters: declaratief, zodat de UI (filterkolom) en de
// zoek-API ze generiek kunnen afhandelen zonder per filter nieuwe schermen.
export interface OntdekFilterDef {
  key: string
  label: string
  type: 'checkbox' | 'select' | 'bereik'
  opties?: { value: string; label: string }[]
}

export interface OntdekCategorieConfig {
  categorie: TpwCategorie
  slug: string
  // Eén zin voor het categorie-kaartje op de ontdekpagina.
  omschrijving: string
  // Categoriespecifieke filters — nu overal leeg, zie toelichting hierboven.
  filters: OntdekFilterDef[]
}

const OMSCHRIJVINGEN: Record<TpwCategorie, string> = {
  Trouwlocaties: 'Kastelen, landgoederen, strand en meer',
  Weddingplanners: 'Hulp bij de hele dag of de puntjes op de i',
  Trouwambtenaren: 'Wie voltrekt jullie ja-woord?',
  Trouwjurken: 'Bruidsmodewinkels en couture',
  Trouwpakken: 'Maatpakken en trouwkostuums',
  Bruidsmakeup: 'Visagie voor de grote dag',
  Bruidskapsels: 'Hairstylisten, in de salon of aan huis',
  Trouwringen: 'Juweliers en goudsmeden',
  Trouwfotografen: 'Jullie dag vastgelegd in beeld',
  Videografen: 'Trouwfilms en aftermovies',
  Photobooths: 'Fotohokjes en spiegels voor het feest',
  Bruidstaart: 'Taarten, sweet tables en patisserie',
  Catering: 'Van foodtruck tot diner op locatie',
  Decoratie: 'Styling, verhuur en aankleding',
  Bloemen: 'Bruidsboeketten en bloemdecoratie',
  Muziek: "DJ's, bands en ceremoniemuzikanten",
  Trouwvervoer: 'Oldtimers, busjes en bijzonder vervoer',
  Entertainment: 'Acts en vermaak voor jullie gasten',
  Trouwkaarten: 'Uitnodigingen en drukwerk',
  Bedankjes: 'Kleine cadeaus voor jullie gasten',
}

export const ONTDEK_CATEGORIEEN: OntdekCategorieConfig[] = TPW_CATEGORIEEN.map((categorie) => ({
  categorie,
  slug: tpwCategorieNaarSlug(categorie),
  omschrijving: OMSCHRIJVINGEN[categorie],
  filters: [],
}))

export function configVoorCategorie(categorie: TpwCategorie): OntdekCategorieConfig {
  return ONTDEK_CATEGORIEEN.find((c) => c.categorie === categorie) ?? {
    categorie,
    slug: tpwCategorieNaarSlug(categorie),
    omschrijving: '',
    filters: [],
  }
}
