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
