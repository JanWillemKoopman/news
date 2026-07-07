// Register: preset → structurele thema-renderer. De zes archetypes staan
// beschreven in README.md; elk thema heeft een volledig eigen layout,
// componentstructuur en bewegingstaal — bewust géén gedeeld ontwerp.

import type { WeddingThema } from '@/lib/bruiloft/types'

import { atelierTheme } from './atelier'
import { editorTheme } from './editor'
import { jardinTheme } from './jardin'
import { landgoedTheme } from './landgoed'
import { studioTheme } from './studio'
import { tuinTheme } from './tuin'
import type { ThemeRenderer } from './types'

export const THEME_RENDERERS: Record<WeddingThema, ThemeRenderer> = {
  klassiek: atelierTheme,       // The Atelier — de gedrukte uitnodiging
  modern: editorTheme,          // The Editor — het magazine
  romantisch: jardinTheme,      // Le Jardin — de liefdesbrief
  rustiek: landgoedTheme,       // Het Landgoed — het veldjournaal
  minimalistisch: studioTheme,  // Studio — de galeriecatalogus
  botanisch: tuinTheme,         // De Tuin — de serre
}

export type { ThemeRenderer } from './types'
