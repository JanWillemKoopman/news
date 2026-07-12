// Domeinhelpers voor de documentenverkenner: bestandstypen, groottes,
// standaardmappen en het uniforme "regel"-model waarmee de pagina eigen
// bestanden én de automatische systeemmappen (leveranciers/budget) door
// elkaar kan tonen en doorzoeken.

import {
  FileImage,
  FileSpreadsheet,
  FileText,
  File as FileIcon,
  type LucideIcon,
} from 'lucide-react'

import type { BudgetItemDocument, VendorDocument, WeddingDocument } from './types'

// Zelfde limieten en typen als de storage-bucket (migratie 0079) — hier
// alvast checken zodat de gebruiker een nette melding krijgt i.p.v. een
// storage-fout.
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
export const MAX_DOCUMENTEN_PER_BRUILOFT = 200

export const TOEGESTANE_EXTENSIES = [
  'pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx', 'xls', 'xlsx', 'txt',
]
export const DOCUMENT_ACCEPT = TOEGESTANE_EXTENSIES.map((e) => `.${e}`).join(',')

export function formatGrootte(bytes: number): string {
  if (bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

// Icoon op bestandstype — één blik en je weet wat het is, zonder badges.
export function bestandsIcoon(naam: string, mimeType: string): LucideIcon {
  const ext = naam.split('.').pop()?.toLowerCase() ?? ''
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) {
    return FileImage
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return FileText
  return FileIcon
}

// De voorgestelde startmappen (lege staat) — gebaseerd op hoe planners
// bruidsparen aanraden hun map op Google Drive in te richten: per soort
// document, niet per leverancier (dat doen de systeemmappen al).
export const STANDAARD_MAPPEN = [
  'Contracten',
  'Offertes & facturen',
  'Ceremonie & speeches',
  'Inspiratie',
  'Overig',
]

// --- Uniform regel-model -------------------------------------------------
// De verkenner toont drie soorten bestanden door elkaar: eigen uploads
// (verplaatsbaar/hernoembaar), leveranciersdocumenten en budgetdocumenten
// (alleen-lezen, beheerd op hun eigen pagina). Dit model maakt zoeken en
// renderen uniform zonder de brondata te dupliceren.

export type DocumentBron = 'eigen' | 'leverancier' | 'budget'

export interface DocumentRegel {
  key: string
  bron: DocumentBron
  naam: string
  mimeType: string
  grootte: number
  createdAt: string
  // Waar het bestand "woont", als leesbare tekst ("Leveranciers · DJ Mike").
  locatie: string
  eigen?: WeddingDocument
  leverancier?: VendorDocument
  budget?: BudgetItemDocument
}

export function eigenRegel(doc: WeddingDocument, locatie: string): DocumentRegel {
  return {
    key: `eigen:${doc.id}`,
    bron: 'eigen',
    naam: doc.naam,
    mimeType: doc.mimeType,
    grootte: doc.grootte,
    createdAt: doc.createdAt,
    locatie,
    eigen: doc,
  }
}

export function leveranciersRegel(doc: VendorDocument, vendorNaam: string): DocumentRegel {
  return {
    key: `leverancier:${doc.id}`,
    bron: 'leverancier',
    naam: doc.naam,
    mimeType: doc.mimeType,
    grootte: doc.grootte,
    createdAt: doc.createdAt,
    locatie: `Leveranciers · ${vendorNaam}`,
    leverancier: doc,
  }
}

export function budgetRegel(doc: BudgetItemDocument, postNaam: string): DocumentRegel {
  return {
    key: `budget:${doc.id}`,
    bron: 'budget',
    naam: doc.naam,
    mimeType: doc.mimeType,
    grootte: doc.grootte,
    createdAt: doc.createdAt,
    locatie: `Budget · ${postNaam}`,
    budget: doc,
  }
}

// Simpele naam-zoektocht (case- en accentongevoelig genoeg voor NL-gebruik).
export function zoekMatch(tekst: string, zoekterm: string): boolean {
  return tekst.toLowerCase().includes(zoekterm.toLowerCase())
}
