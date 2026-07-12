// Gedeelde rechten-logica voor de client (UX). De DATABASE (RLS) is de
// autoritatieve grens; dit stuurt alleen wat we tonen/inschakelen.

export const MODULES = [
  'dashboard',
  'taken',
  'budget',
  'leveranciers',
  'gasten',
  'website',
  'draaiboek',
  'tafels',
  'registry',
  'moodboard',
  'muziek',
  'beheer',
] as const

export type Module = (typeof MODULES)[number]
export type Level = 'none' | 'view' | 'edit'
export type WeddingRole = 'owner' | 'planner' | 'helper' | 'viewer'
// Rollen waarvan de admin de rechten kan bijstellen (owner = altijd alles).
export type EditableRole = Exclude<WeddingRole, 'owner'>
export const EDITABLE_ROLES: EditableRole[] = ['planner', 'helper', 'viewer']

export type PermissionMap = Record<Module, Level>

export const EMPTY_PERMISSIONS: PermissionMap = Object.fromEntries(
  MODULES.map((m) => [m, 'none'])
) as PermissionMap

export const ALL_EDIT_PERMISSIONS: PermissionMap = Object.fromEntries(
  MODULES.map((m) => [m, 'edit'])
) as PermissionMap

export function canView(p: PermissionMap, m: Module): boolean {
  return p[m] === 'view' || p[m] === 'edit'
}

export function canEdit(p: PermissionMap, m: Module): boolean {
  return p[m] === 'edit'
}

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: 'Dashboard',
  taken: 'Taken',
  budget: 'Budget',
  leveranciers: 'Leveranciers',
  gasten: 'Gasten',
  website: 'Website',
  draaiboek: 'Draaiboek',
  tafels: 'Tafels',
  registry: 'Cadeaulijst',
  moodboard: 'Moodboard',
  muziek: 'Muziek',
  beheer: 'Beheer (leden & instellingen)',
}

export const ROLE_LABELS: Record<WeddingRole, string> = {
  owner: 'Eigenaar (bruidspaar)',
  planner: 'Planner',
  helper: 'Helper',
  viewer: 'Kijker',
}

export const ROLE_DESCRIPTIONS: Record<WeddingRole, string> = {
  owner: 'Volledige toegang; beheert leden en rechten.',
  planner: 'Helpt breed mee plannen (bijv. ceremoniemeester).',
  helper: 'Helpt met specifieke onderdelen (bijv. getuige).',
  viewer: 'Kan meekijken, niets wijzigen.',
}

export const LEVEL_LABELS: Record<Level, string> = {
  none: 'Niets',
  view: 'Zien',
  edit: 'Bewerken',
}

// Korte uitleg per module voor de rechten-matrix op de ledenpagina.
export const MODULE_DESCRIPTIONS: Record<Module, string> = {
  dashboard: 'Het overzicht met de voortgang van de planning.',
  taken: 'De takenlijst met deadlines en verantwoordelijken.',
  budget: 'Het totaalbudget, uitgaven en betaaltermijnen.',
  leveranciers: 'Jullie leverancierslijst, offertes en berichten.',
  gasten: 'De gastenlijst met contactgegevens en RSVP-status.',
  website: 'De trouwwebsite en de fotomuur.',
  draaiboek: 'Het draaiboek van de trouwdag.',
  tafels: 'De tafelschikking.',
  registry: 'De cadeaulijst en bijdragen van gasten.',
  moodboard: 'Het inspiratiebord met sfeerbeelden voor de bruiloft.',
  muziek: 'De muzieklijst per moment en de wensen van gasten.',
  beheer: 'De bruiloftsgegevens (namen, datum, budgetinstelling).',
}

// Wat elke rol wel en niet kan — voor de uitleg op de ledenpagina. De
// rechten per onderdeel komen uit de matrix; dit zijn de vaste kaders.
export const ROLE_SUMMARIES: Record<WeddingRole, string> = {
  owner:
    'Ziet en bewerkt alles, nodigt leden uit, wijzigt rollen en stelt per onderdeel in wat andere rollen mogen.',
  planner:
    'Werkt breed mee aan de planning. Wat een planner per onderdeel ziet of bewerkt, stellen jullie hieronder in.',
  helper:
    'Helpt met specifieke onderdelen. Wat een helper per onderdeel ziet of bewerkt, stellen jullie hieronder in.',
  viewer:
    'Kijkt mee zonder iets te kunnen wijzigen. Welke onderdelen zichtbaar zijn, stellen jullie hieronder in.',
}
