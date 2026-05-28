// Expliciete vertaling tussen DB-rijen (snake_case) en domeintypes (camelCase).
// Bewust geen generieke deep-convert: dat zou jsonb-keys (betaaltermijnen,
// betrokkenen) verminken.

import type { Database } from '@/lib/supabase/database.types'

import type {
  ActivityEntry,
  BudgetItem,
  BudgetItemInput,
  Guest,
  GuestInput,
  PaymentTerm,
  Rol,
  ScheduleItem,
  ScheduleItemInput,
  Subtaak,
  Table,
  TableInput,
  Task,
  TaskComment,
  TaskCommentInput,
  TaskInput,
  Vendor,
  VendorInput,
  Wedding,
  WeddingInput,
  WebsiteContent,
  WebsiteContentInput,
} from './types'

type Tables = Database['public']['Tables']

const num = (v: number | string | null | undefined): number => (v == null ? 0 : Number(v))

// --- Wedding ---------------------------------------------------------
export function weddingFromRow(r: Tables['weddings']['Row']): Wedding {
  return {
    id: r.id,
    partner1Naam: r.partner1_naam,
    partner2Naam: r.partner2_naam,
    trouwdatum: r.trouwdatum ?? '',
    locatie: r.locatie,
    totaalBudget: num(r.totaal_budget),
    aantalDaggasten: r.aantal_daggasten,
    aantalAvondgasten: r.aantal_avondgasten,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function weddingToRow(p: Partial<WeddingInput>): Partial<Tables['weddings']['Insert']> {
  const r: Partial<Tables['weddings']['Insert']> = {}
  if (p.partner1Naam !== undefined) r.partner1_naam = p.partner1Naam
  if (p.partner2Naam !== undefined) r.partner2_naam = p.partner2Naam
  if (p.trouwdatum !== undefined) r.trouwdatum = p.trouwdatum || null
  if (p.locatie !== undefined) r.locatie = p.locatie
  if (p.totaalBudget !== undefined) r.totaal_budget = p.totaalBudget
  if (p.aantalDaggasten !== undefined) r.aantal_daggasten = p.aantalDaggasten
  if (p.aantalAvondgasten !== undefined) r.aantal_avondgasten = p.aantalAvondgasten
  return r
}

// --- Guest -----------------------------------------------------------
export function guestFromRow(r: Tables['guests']['Row']): Guest {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    voornaam: r.voornaam,
    achternaam: r.achternaam,
    categorie: r.categorie as Guest['categorie'],
    gasttype: r.gasttype as Guest['gasttype'],
    rsvpStatus: r.rsvp_status as Guest['rsvpStatus'],
    dieetwensen: r.dieetwensen,
    heeftPartner: r.heeft_partner,
    partnerNaam: r.partner_naam,
    aantalKinderen: r.aantal_kinderen,
    adres: r.adres,
    notitie: r.notitie,
    tafelId: r.tafel_id ?? undefined,
    rsvpCode: r.rsvp_token ?? undefined,
  }
}

export function guestToRow(p: Partial<GuestInput>): Partial<Tables['guests']['Insert']> {
  const r: Partial<Tables['guests']['Insert']> = {}
  if (p.weddingId !== undefined) r.wedding_id = p.weddingId
  if (p.voornaam !== undefined) r.voornaam = p.voornaam
  if (p.achternaam !== undefined) r.achternaam = p.achternaam
  if (p.categorie !== undefined) r.categorie = p.categorie
  if (p.gasttype !== undefined) r.gasttype = p.gasttype
  if (p.rsvpStatus !== undefined) r.rsvp_status = p.rsvpStatus
  if (p.dieetwensen !== undefined) r.dieetwensen = p.dieetwensen
  if (p.heeftPartner !== undefined) r.heeft_partner = p.heeftPartner
  if (p.partnerNaam !== undefined) r.partner_naam = p.partnerNaam
  if (p.aantalKinderen !== undefined) r.aantal_kinderen = p.aantalKinderen
  if (p.adres !== undefined) r.adres = p.adres
  if (p.notitie !== undefined) r.notitie = p.notitie
  if (p.tafelId !== undefined) r.tafel_id = p.tafelId ?? null
  // rsvpCode/rsvp_token wordt door de database beheerd; niet schrijven.
  return r
}

// --- Task ------------------------------------------------------------
export function taskFromRow(r: Tables['tasks']['Row']): Task {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    titel: r.titel,
    omschrijving: r.omschrijving,
    deadline: r.deadline ?? '',
    tijdsblok: r.tijdsblok as Task['tijdsblok'],
    status: r.status as Task['status'],
    prioriteit: r.prioriteit as Task['prioriteit'],
    toegewezenAan: r.toegewezen_aan as Task['toegewezenAan'],
    assignees: (r.assignees as string[] | null) ?? [],
    subtaken: (r.subtaken as unknown as Subtaak[] | null) ?? [],
    volgorde: r.volgorde ?? undefined,
    vendorId: r.vendor_id ?? undefined,
    budgetItemId: r.budget_item_id ?? undefined,
  }
}

export function taskToRow(p: Partial<TaskInput>): Partial<Tables['tasks']['Insert']> {
  const r: Partial<Tables['tasks']['Insert']> = {}
  if (p.weddingId !== undefined) r.wedding_id = p.weddingId
  if (p.titel !== undefined) r.titel = p.titel
  if (p.omschrijving !== undefined) r.omschrijving = p.omschrijving
  if (p.deadline !== undefined) r.deadline = p.deadline || null
  if (p.tijdsblok !== undefined) r.tijdsblok = p.tijdsblok
  if (p.status !== undefined) r.status = p.status
  if (p.prioriteit !== undefined) r.prioriteit = p.prioriteit
  if (p.toegewezenAan !== undefined) r.toegewezen_aan = p.toegewezenAan
  if (p.assignees !== undefined) r.assignees = p.assignees
  if (p.subtaken !== undefined)
    r.subtaken = p.subtaken as unknown as Tables['tasks']['Insert']['subtaken']
  if (p.volgorde !== undefined) r.volgorde = p.volgorde ?? null
  if (p.vendorId !== undefined) r.vendor_id = p.vendorId ?? null
  if (p.budgetItemId !== undefined) r.budget_item_id = p.budgetItemId ?? null
  return r
}

// --- Vendor ----------------------------------------------------------
export function vendorFromRow(r: Tables['vendors']['Row']): Vendor {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    naam: r.naam,
    type: r.type as Vendor['type'],
    status: r.status as Vendor['status'],
    contactpersoon: r.contactpersoon,
    telefoon: r.telefoon,
    email: r.email,
    website: r.website,
    geoffreerdBedrag: num(r.geoffreerd_bedrag),
    notitie: r.notitie,
    budgetItemId: r.budget_item_id ?? undefined,
  }
}

export function vendorToRow(p: Partial<VendorInput>): Partial<Tables['vendors']['Insert']> {
  const r: Partial<Tables['vendors']['Insert']> = {}
  if (p.weddingId !== undefined) r.wedding_id = p.weddingId
  if (p.naam !== undefined) r.naam = p.naam
  if (p.type !== undefined) r.type = p.type
  if (p.status !== undefined) r.status = p.status
  if (p.contactpersoon !== undefined) r.contactpersoon = p.contactpersoon
  if (p.telefoon !== undefined) r.telefoon = p.telefoon
  if (p.email !== undefined) r.email = p.email
  if (p.website !== undefined) r.website = p.website
  if (p.geoffreerdBedrag !== undefined) r.geoffreerd_bedrag = p.geoffreerdBedrag
  if (p.notitie !== undefined) r.notitie = p.notitie
  if (p.budgetItemId !== undefined) r.budget_item_id = p.budgetItemId ?? null
  return r
}

// --- BudgetItem ------------------------------------------------------
export function budgetItemFromRow(r: Tables['budget_items']['Row']): BudgetItem {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    categorie: r.categorie as BudgetItem['categorie'],
    omschrijving: r.omschrijving,
    geschatBedrag: num(r.geschat_bedrag),
    geoffreerdBedrag: num(r.geoffreerd_bedrag),
    betaaldBedrag: num(r.betaald_bedrag),
    vendorId: r.vendor_id ?? undefined,
    betaaltermijnen: (r.betaaltermijnen as unknown as PaymentTerm[]) ?? [],
  }
}

export function budgetItemToRow(
  p: Partial<BudgetItemInput>
): Partial<Tables['budget_items']['Insert']> {
  const r: Partial<Tables['budget_items']['Insert']> = {}
  if (p.weddingId !== undefined) r.wedding_id = p.weddingId
  if (p.categorie !== undefined) r.categorie = p.categorie
  if (p.omschrijving !== undefined) r.omschrijving = p.omschrijving
  if (p.geschatBedrag !== undefined) r.geschat_bedrag = p.geschatBedrag
  if (p.geoffreerdBedrag !== undefined) r.geoffreerd_bedrag = p.geoffreerdBedrag
  if (p.betaaldBedrag !== undefined) r.betaald_bedrag = p.betaaldBedrag
  if (p.vendorId !== undefined) r.vendor_id = p.vendorId ?? null
  if (p.betaaltermijnen !== undefined)
    r.betaaltermijnen = p.betaaltermijnen as unknown as Tables['budget_items']['Insert']['betaaltermijnen']
  return r
}

// --- ScheduleItem ----------------------------------------------------
export function scheduleItemFromRow(r: Tables['schedule_items']['Row']): ScheduleItem {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    tijd: r.tijd,
    titel: r.titel,
    omschrijving: r.omschrijving,
    locatie: r.locatie,
    betrokkenen: (r.betrokkenen as unknown as Rol[]) ?? [],
  }
}

export function scheduleItemToRow(
  p: Partial<ScheduleItemInput>
): Partial<Tables['schedule_items']['Insert']> {
  const r: Partial<Tables['schedule_items']['Insert']> = {}
  if (p.weddingId !== undefined) r.wedding_id = p.weddingId
  if (p.tijd !== undefined) r.tijd = p.tijd
  if (p.titel !== undefined) r.titel = p.titel
  if (p.omschrijving !== undefined) r.omschrijving = p.omschrijving
  if (p.locatie !== undefined) r.locatie = p.locatie
  if (p.betrokkenen !== undefined)
    r.betrokkenen = p.betrokkenen as unknown as Tables['schedule_items']['Insert']['betrokkenen']
  return r
}

// --- Table -----------------------------------------------------------
export function tableFromRow(r: Tables['tables']['Row']): Table {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    naam: r.naam,
    vorm: r.vorm as Table['vorm'],
    capaciteit: r.capaciteit,
  }
}

export function tableToRow(p: Partial<TableInput>): Partial<Tables['tables']['Insert']> {
  const r: Partial<Tables['tables']['Insert']> = {}
  if (p.weddingId !== undefined) r.wedding_id = p.weddingId
  if (p.naam !== undefined) r.naam = p.naam
  if (p.vorm !== undefined) r.vorm = p.vorm
  if (p.capaciteit !== undefined) r.capaciteit = p.capaciteit
  return r
}

// --- WebsiteContent --------------------------------------------------
export function websiteContentFromRow(r: Tables['website_content']['Row']): WebsiteContent {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    welkomsttekst: r.welkomsttekst,
    dresscode: r.dresscode,
    cadeaulijst: r.cadeaulijst,
    hotels: r.hotels,
    routebeschrijving: r.routebeschrijving,
    contact: r.contact,
  }
}

export function websiteContentToRow(
  p: Partial<WebsiteContentInput>
): Partial<Tables['website_content']['Insert']> {
  const r: Partial<Tables['website_content']['Insert']> = {}
  if (p.weddingId !== undefined) r.wedding_id = p.weddingId
  if (p.welkomsttekst !== undefined) r.welkomsttekst = p.welkomsttekst
  if (p.dresscode !== undefined) r.dresscode = p.dresscode
  if (p.cadeaulijst !== undefined) r.cadeaulijst = p.cadeaulijst
  if (p.hotels !== undefined) r.hotels = p.hotels
  if (p.routebeschrijving !== undefined) r.routebeschrijving = p.routebeschrijving
  if (p.contact !== undefined) r.contact = p.contact
  return r
}

// --- ActivityEntry (alleen lezen; de DB-trigger schrijft) ------------
export function activityFromRow(r: Tables['wedding_activity']['Row']): ActivityEntry {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    module: r.module as ActivityEntry['module'],
    entityType: r.entity_type,
    entityId: r.entity_id ?? undefined,
    action: r.action as ActivityEntry['action'],
    actorId: r.actor_id ?? undefined,
    actorName: r.actor_name,
    label: r.label,
    createdAt: r.created_at,
  }
}

// --- TaskComment -----------------------------------------------------
export function taskCommentFromRow(r: Tables['task_comments']['Row']): TaskComment {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    taskId: r.task_id,
    authorId: r.author_id ?? undefined,
    authorName: r.author_name,
    body: r.body,
    createdAt: r.created_at,
  }
}

// author_id/author_name worden server-side (trigger) ingevuld; niet meesturen.
export function taskCommentToRow(p: TaskCommentInput): Tables['task_comments']['Insert'] {
  return {
    wedding_id: p.weddingId,
    task_id: p.taskId,
    body: p.body,
  }
}
