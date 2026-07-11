// Supabase-implementatie van de WeddingRepository. De app verandert niet:
// dezelfde interface, maar nu met persistente, gedeelde, RLS-beveiligde opslag.

import { createClient, createRawClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

import {
  activityFromRow,
  adresShareFromRow,
  agendaShareFromRow,
  budgetItemDocumentFromRow,
  budgetItemFromRow,
  budgetItemToRow,
  draaiboekShareFromRow,
  guestFromRow,
  guestToRow,
  messageFromRow,
  messageReadFromRow,
  scheduleItemFromRow,
  scheduleItemToRow,
  tableFromRow,
  tableToRow,
  taskCommentFromRow,
  taskCommentToRow,
  taskFromRow,
  taskToRow,
  vendorContactRequestFromRow,
  vendorDocumentFromRow,
  vendorFromRow,
  vendorToRow,
  websiteContentFromRow,
  websiteContentToRow,
  websiteFotoFromRow,
  websitePageFromRow,
  websitePageToRow,
  weddingFromRow,
  weddingToRow,
} from './mappers'
import type { WeddingRepository } from './repository'
import type {
  ActivityEntry,
  AdresShare,
  AgendaShare,
  BudgetItem,
  BudgetItemDocument,
  BudgetItemDocumentInput,
  BudgetItemInput,
  DraaiboekShare,
  Guest,
  GuestInput,
  GuestPatch,
  ID,
  Message,
  MessageRead,
  ScheduleItem,
  ScheduleItemInput,
  Table,
  TableInput,
  Task,
  TaskComment,
  TaskCommentInput,
  TaskInput,
  Vendor,
  VendorContactRequest,
  VendorDocument,
  VendorDocumentInput,
  VendorInput,
  Wedding,
  WeddingInput,
  WeddingMember,
  WeddingRoleSnapshot,
  WebsiteContent,
  WebsiteContentInput,
  WebsiteFoto,
} from './types'
import type { WebsitePage, WebsitePageInput } from './websiteBlocks'

type Tables = Database['public']['Tables']

export class SupabaseWeddingRepository implements WeddingRepository {
  private db = createClient()
  // messages/message_reads ontbreken nog in de gegenereerde database.types.ts
  // (nieuwe migratie 0058), vandaar de ongetypeerde client — zelfde patroon
  // als loadRegistry() in de store.
  private rawDb = createRawClient()

  // --- Wedding -------------------------------------------------------
  async listWeddings(): Promise<Wedding[]> {
    const { data, error } = await this.db
      .from('weddings')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(weddingFromRow)
  }

  async getWedding(id: ID): Promise<Wedding | null> {
    const { data, error } = await this.db.from('weddings').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? weddingFromRow(data) : null
  }

  async getActiveWedding(): Promise<Wedding | null> {
    // RLS scoopt al op de bruiloften van deze gebruiker; pak de oudste.
    const { data, error } = await this.db
      .from('weddings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data ? weddingFromRow(data) : null
  }

  async createWedding(input: WeddingInput): Promise<Wedding> {
    const { data, error } = await this.db
      .from('weddings')
      .insert(weddingToRow(input) as Tables['weddings']['Insert'])
      .select()
      .single()
    if (error) throw error
    return weddingFromRow(data)
  }

  async updateWedding(id: ID, patch: Partial<WeddingInput>): Promise<Wedding> {
    const { data, error } = await this.db
      .from('weddings')
      .update(weddingToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return weddingFromRow(data)
  }

  async deleteWedding(id: ID): Promise<void> {
    const { error } = await this.db.from('weddings').delete().eq('id', id)
    if (error) throw error
  }

  // --- Guests --------------------------------------------------------
  async listGuests(weddingId: ID): Promise<Guest[]> {
    const { data, error } = await this.db
      .from('guests')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(guestFromRow)
  }

  async createGuest(input: GuestInput): Promise<Guest> {
    const { data, error } = await this.db
      .from('guests')
      .insert(guestToRow(input) as Tables['guests']['Insert'])
      .select()
      .single()
    if (error) throw error
    return guestFromRow(data)
  }

  async createGuests(inputs: GuestInput[]): Promise<Guest[]> {
    if (inputs.length === 0) return []
    const rows = inputs.map((i) => guestToRow(i) as Tables['guests']['Insert'])
    const { data, error } = await this.db.from('guests').insert(rows).select()
    if (error) throw error
    return (data ?? []).map(guestFromRow)
  }

  async updateGuest(id: ID, patch: GuestPatch): Promise<Guest> {
    const { data, error } = await this.db
      .from('guests')
      .update(guestToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return guestFromRow(data)
  }

  async deleteGuest(id: ID): Promise<void> {
    const { error } = await this.db.from('guests').delete().eq('id', id)
    if (error) throw error
  }

  // --- Tasks ---------------------------------------------------------
  async listTasks(weddingId: ID): Promise<Task[]> {
    const { data, error } = await this.db
      .from('tasks')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('deadline', { ascending: true })
    if (error) throw error
    return (data ?? []).map(taskFromRow)
  }

  async createTask(input: TaskInput): Promise<Task> {
    const { data, error } = await this.db
      .from('tasks')
      .insert(taskToRow(input) as Tables['tasks']['Insert'])
      .select()
      .single()
    if (error) throw error
    return taskFromRow(data)
  }

  async createTasks(inputs: TaskInput[]): Promise<Task[]> {
    if (inputs.length === 0) return []
    const rows = inputs.map((i) => taskToRow(i) as Tables['tasks']['Insert'])
    const { data, error } = await this.db.from('tasks').insert(rows).select()
    if (error) throw error
    return (data ?? []).map(taskFromRow)
  }

  async updateTask(id: ID, patch: Partial<TaskInput>): Promise<Task> {
    const { data, error } = await this.db
      .from('tasks')
      .update(taskToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return taskFromRow(data)
  }

  async deleteTask(id: ID): Promise<void> {
    const { error } = await this.db.from('tasks').delete().eq('id', id)
    if (error) throw error
  }

  // --- Vendors -------------------------------------------------------
  async listVendors(weddingId: ID): Promise<Vendor[]> {
    const { data, error } = await this.db
      .from('vendors')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(vendorFromRow)
  }

  async createVendor(input: VendorInput): Promise<Vendor> {
    const { data, error } = await this.db
      .from('vendors')
      .insert(vendorToRow(input) as Tables['vendors']['Insert'])
      .select()
      .single()
    if (error) throw error
    return vendorFromRow(data)
  }

  async updateVendor(id: ID, patch: Partial<VendorInput>): Promise<Vendor> {
    const { data, error } = await this.db
      .from('vendors')
      .update(vendorToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return vendorFromRow(data)
  }

  async deleteVendor(id: ID): Promise<void> {
    const { error } = await this.db.from('vendors').delete().eq('id', id)
    if (error) throw error
  }

  async listVendorContactRequests(weddingId: ID): Promise<VendorContactRequest[]> {
    const { data, error } = await this.db
      .from('vendor_contact_requests')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(vendorContactRequestFromRow)
  }

  // --- Documentenkluis -------------------------------------------------
  // vendor_documents ontbreekt nog in de gegenereerde database.types.ts
  // (nieuwe migratie 0068), vandaar rawDb — zelfde patroon als messages.
  async listVendorDocuments(weddingId: ID): Promise<VendorDocument[]> {
    const { data, error } = await this.rawDb
      .from('vendor_documents')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(vendorDocumentFromRow)
  }

  async createVendorDocument(input: VendorDocumentInput): Promise<VendorDocument> {
    const { data, error } = await this.rawDb
      .from('vendor_documents')
      .insert({
        wedding_id: input.weddingId,
        vendor_id: input.vendorId,
        naam: input.naam,
        soort: input.soort,
        storage_path: input.storagePath,
        mime_type: input.mimeType,
        grootte: input.grootte,
      })
      .select()
      .single()
    if (error) throw error
    return vendorDocumentFromRow(data)
  }

  async deleteVendorDocument(id: ID): Promise<void> {
    const { error } = await this.rawDb.from('vendor_documents').delete().eq('id', id)
    if (error) throw error
  }

  // --- Draaiboek delen -------------------------------------------------
  // draaiboek_shares ontbreekt nog in de gegenereerde database.types.ts
  // (nieuwe migratie 0069), vandaar rawDb — zelfde patroon als messages.
  async getDraaiboekShare(weddingId: ID): Promise<DraaiboekShare | null> {
    const { data, error } = await this.rawDb
      .from('draaiboek_shares')
      .select('*')
      .eq('wedding_id', weddingId)
      .maybeSingle()
    if (error) throw error
    return data ? draaiboekShareFromRow(data) : null
  }

  async createDraaiboekShare(weddingId: ID): Promise<DraaiboekShare> {
    const { data, error } = await this.rawDb
      .from('draaiboek_shares')
      .insert({ wedding_id: weddingId })
      .select()
      .single()
    if (error) throw error
    return draaiboekShareFromRow(data)
  }

  async deleteDraaiboekShare(weddingId: ID): Promise<void> {
    const { error } = await this.rawDb.from('draaiboek_shares').delete().eq('wedding_id', weddingId)
    if (error) throw error
  }

  // --- Agenda-koppeling ------------------------------------------------
  // agenda_shares: zelfde drift-situatie als draaiboek_shares (0071).
  async getAgendaShare(weddingId: ID): Promise<AgendaShare | null> {
    const { data, error } = await this.rawDb
      .from('agenda_shares')
      .select('*')
      .eq('wedding_id', weddingId)
      .maybeSingle()
    if (error) throw error
    return data ? agendaShareFromRow(data) : null
  }

  async createAgendaShare(weddingId: ID): Promise<AgendaShare> {
    const { data, error } = await this.rawDb
      .from('agenda_shares')
      .insert({ wedding_id: weddingId })
      .select()
      .single()
    if (error) throw error
    return agendaShareFromRow(data)
  }

  async deleteAgendaShare(weddingId: ID): Promise<void> {
    const { error } = await this.rawDb.from('agenda_shares').delete().eq('wedding_id', weddingId)
    if (error) throw error
  }

  // --- Adreslink ---------------------------------------------------------
  // adres_shares: zelfde drift-situatie als de andere shares (0072).
  async getAdresShare(weddingId: ID): Promise<AdresShare | null> {
    const { data, error } = await this.rawDb
      .from('adres_shares')
      .select('*')
      .eq('wedding_id', weddingId)
      .maybeSingle()
    if (error) throw error
    return data ? adresShareFromRow(data) : null
  }

  async createAdresShare(weddingId: ID): Promise<AdresShare> {
    const { data, error } = await this.rawDb
      .from('adres_shares')
      .insert({ wedding_id: weddingId })
      .select()
      .single()
    if (error) throw error
    return adresShareFromRow(data)
  }

  async deleteAdresShare(weddingId: ID): Promise<void> {
    const { error } = await this.rawDb.from('adres_shares').delete().eq('wedding_id', weddingId)
    if (error) throw error
  }

  // --- Berichtencentrum ------------------------------------------------
  async listMessages(weddingId: ID): Promise<Message[]> {
    const { data, error } = await this.rawDb
      .from('messages')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(messageFromRow)
  }

  async listMessageReads(weddingId: ID): Promise<MessageRead[]> {
    const { data, error } = await this.rawDb
      .from('message_reads')
      .select('*, messages!inner(wedding_id)')
      .eq('messages.wedding_id', weddingId)
    if (error) throw error
    return (data ?? []).map(messageReadFromRow)
  }

  async markMessageRead(messageId: ID): Promise<MessageRead> {
    const { data, error } = await this.rawDb
      .from('message_reads')
      .upsert({ message_id: messageId }, { onConflict: 'message_id,user_id' })
      .select()
      .single()
    if (error) throw error
    return messageReadFromRow(data)
  }

  // Archiveren/verwijderen: alleen archived_at/deleted_at zijn schrijfbaar
  // vanaf de client — messages_guard_update() (migratie 0061) dwingt dat af,
  // ook als hier per ongeluk meer velden meegestuurd zouden worden.
  private async patchMessage(messageId: ID, patch: Record<string, unknown>): Promise<Message> {
    const { data, error } = await this.rawDb
      .from('messages')
      .update(patch)
      .eq('id', messageId)
      .select()
      .single()
    if (error) throw error
    return messageFromRow(data)
  }

  async archiveMessage(messageId: ID): Promise<Message> {
    return this.patchMessage(messageId, { archived_at: new Date().toISOString() })
  }

  async unarchiveMessage(messageId: ID): Promise<Message> {
    return this.patchMessage(messageId, { archived_at: null })
  }

  async trashMessage(messageId: ID): Promise<Message> {
    return this.patchMessage(messageId, { deleted_at: new Date().toISOString() })
  }

  async restoreMessage(messageId: ID): Promise<Message> {
    return this.patchMessage(messageId, { deleted_at: null })
  }

  // --- BudgetItems ---------------------------------------------------
  async listBudgetItems(weddingId: ID): Promise<BudgetItem[]> {
    const { data, error } = await this.db
      .from('budget_items')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(budgetItemFromRow)
  }

  async createBudgetItem(input: BudgetItemInput): Promise<BudgetItem> {
    const { data, error } = await this.db
      .from('budget_items')
      .insert(budgetItemToRow(input) as Tables['budget_items']['Insert'])
      .select()
      .single()
    if (error) throw error
    return budgetItemFromRow(data)
  }

  async createBudgetItems(inputs: BudgetItemInput[]): Promise<BudgetItem[]> {
    if (inputs.length === 0) return []
    const rows = inputs.map((i) => budgetItemToRow(i) as Tables['budget_items']['Insert'])
    const { data, error } = await this.db.from('budget_items').insert(rows).select()
    if (error) throw error
    return (data ?? []).map(budgetItemFromRow)
  }

  async updateBudgetItem(id: ID, patch: Partial<BudgetItemInput>): Promise<BudgetItem> {
    const { data, error } = await this.db
      .from('budget_items')
      .update(budgetItemToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return budgetItemFromRow(data)
  }

  async deleteBudgetItem(id: ID): Promise<void> {
    const { error } = await this.db.from('budget_items').delete().eq('id', id)
    if (error) throw error
  }

  // --- Documentenkluis (budgetposten) ---------------------------------
  // budget_item_documents ontbreekt nog in de gegenereerde database.types.ts
  // (nieuwe migratie 0075), vandaar rawDb — zelfde patroon als vendor_documents.
  async listBudgetItemDocuments(weddingId: ID): Promise<BudgetItemDocument[]> {
    const { data, error } = await this.rawDb
      .from('budget_item_documents')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(budgetItemDocumentFromRow)
  }

  async createBudgetItemDocument(input: BudgetItemDocumentInput): Promise<BudgetItemDocument> {
    const { data, error } = await this.rawDb
      .from('budget_item_documents')
      .insert({
        wedding_id: input.weddingId,
        budget_item_id: input.budgetItemId,
        naam: input.naam,
        soort: input.soort,
        storage_path: input.storagePath,
        mime_type: input.mimeType,
        grootte: input.grootte,
      })
      .select()
      .single()
    if (error) throw error
    return budgetItemDocumentFromRow(data)
  }

  async deleteBudgetItemDocument(id: ID): Promise<void> {
    const { error } = await this.rawDb.from('budget_item_documents').delete().eq('id', id)
    if (error) throw error
  }

  // --- ScheduleItems -------------------------------------------------
  async listScheduleItems(weddingId: ID): Promise<ScheduleItem[]> {
    const { data, error } = await this.db
      .from('schedule_items')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('tijd', { ascending: true })
    if (error) throw error
    return (data ?? []).map(scheduleItemFromRow)
  }

  async createScheduleItem(input: ScheduleItemInput): Promise<ScheduleItem> {
    const { data, error } = await this.db
      .from('schedule_items')
      .insert(scheduleItemToRow(input) as Tables['schedule_items']['Insert'])
      .select()
      .single()
    if (error) throw error
    return scheduleItemFromRow(data)
  }

  async updateScheduleItem(id: ID, patch: Partial<ScheduleItemInput>): Promise<ScheduleItem> {
    const { data, error } = await this.db
      .from('schedule_items')
      .update(scheduleItemToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return scheduleItemFromRow(data)
  }

  async deleteScheduleItem(id: ID): Promise<void> {
    const { error } = await this.db.from('schedule_items').delete().eq('id', id)
    if (error) throw error
  }

  // --- Tables --------------------------------------------------------
  async listTables(weddingId: ID): Promise<Table[]> {
    const { data, error } = await this.db
      .from('tables')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(tableFromRow)
  }

  async createTable(input: TableInput): Promise<Table> {
    const { data, error } = await this.db
      .from('tables')
      .insert(tableToRow(input) as Tables['tables']['Insert'])
      .select()
      .single()
    if (error) throw error
    return tableFromRow(data)
  }

  async updateTable(id: ID, patch: Partial<TableInput>): Promise<Table> {
    const { data, error } = await this.db
      .from('tables')
      .update(tableToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return tableFromRow(data)
  }

  async deleteTable(id: ID): Promise<void> {
    const { error } = await this.db.from('tables').delete().eq('id', id)
    if (error) throw error
  }

  // --- WebsiteContent ------------------------------------------------
  // Expliciete kolomlijst i.p.v. '*': sluit site_password (het gehashte
  // site-wachtwoord) uit van wat naar de browser gaat. Het domeintype
  // WebsiteContent kent dit veld toch al niet (zie mappers.ts) — dit
  // voorkomt bovendien dat de hash-string het netwerkverkeer in gaat.
  private readonly websiteContentKolommen =
    'id, wedding_id, welkomsttekst, dresscode, cadeaulijst, hotels, routebeschrijving, contact, ' +
    'slug, website_gepubliceerd, thema, kleur_accent, kop_lettertype, header_foto_url, ' +
    'header_overlay, secties_config, faq, gallerij, theme, site_password_enabled, created_at, updated_at'

  async getWebsiteContent(weddingId: ID): Promise<WebsiteContent | null> {
    const { data, error } = await this.db
      .from('website_content')
      .select(this.websiteContentKolommen)
      .eq('wedding_id', weddingId)
      .maybeSingle()
    if (error) throw error
    return data ? websiteContentFromRow(data as unknown as Tables['website_content']['Row']) : null
  }

  async saveWebsiteContent(
    weddingId: ID,
    patch: Partial<WebsiteContentInput>
  ): Promise<WebsiteContent> {
    const row = {
      ...websiteContentToRow(patch),
      wedding_id: weddingId,
    } as Tables['website_content']['Insert']
    const { data, error } = await this.db
      .from('website_content')
      .upsert(row, { onConflict: 'wedding_id' })
      .select(this.websiteContentKolommen)
      .single()
    if (error) throw error
    return websiteContentFromRow(data as unknown as Tables['website_content']['Row'])
  }

  async checkSlugAvailable(slug: string): Promise<boolean> {
    const { data, error } = await this.db.rpc('check_slug_available', { p_slug: slug })
    if (error) throw error
    return data as boolean
  }

  // --- Website-pagina's (website v3: blokken) ------------------------
  async listWebsitePages(weddingId: ID): Promise<WebsitePage[]> {
    const { data, error } = await this.db
      .from('website_pages')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('volgorde', { ascending: true })
    if (error) throw error
    return (data ?? []).map(websitePageFromRow)
  }

  async createWebsitePage(input: WebsitePageInput): Promise<WebsitePage> {
    const row = websitePageToRow(input) as Tables['website_pages']['Insert']
    const { data, error } = await this.db
      .from('website_pages')
      .insert(row)
      .select()
      .single()
    if (error) throw error
    return websitePageFromRow(data)
  }

  async updateWebsitePage(id: ID, patch: Partial<WebsitePageInput>): Promise<WebsitePage> {
    const { data, error } = await this.db
      .from('website_pages')
      .update(websitePageToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return websitePageFromRow(data)
  }

  async deleteWebsitePage(id: ID): Promise<void> {
    const { error } = await this.db.from('website_pages').delete().eq('id', id)
    if (error) throw error
  }

  // --- Website-foto's ------------------------------------------------
  async listWebsiteFotos(weddingId: ID): Promise<WebsiteFoto[]> {
    const { data, error } = await this.db
      .from('website_fotos')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('volgorde', { ascending: true })
    if (error) throw error
    return (data ?? []).map(websiteFotoFromRow)
  }

  async createWebsiteFoto(weddingId: ID, url: string, bijschrift: string, volgorde: number): Promise<WebsiteFoto> {
    const { data, error } = await this.db
      .from('website_fotos')
      .insert({ wedding_id: weddingId, url, bijschrift, volgorde })
      .select()
      .single()
    if (error) throw error
    return websiteFotoFromRow(data)
  }

  async updateWebsiteFoto(id: ID, patch: { bijschrift?: string; volgorde?: number }): Promise<WebsiteFoto> {
    const { data, error } = await this.db
      .from('website_fotos')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return websiteFotoFromRow(data)
  }

  async deleteWebsiteFoto(id: ID): Promise<void> {
    const { error } = await this.db.from('website_fotos').delete().eq('id', id)
    if (error) throw error
  }

  // --- Activity ------------------------------------------------------
  async listActivity(weddingId: ID, limit = 50): Promise<ActivityEntry[]> {
    const { data, error } = await this.db
      .from('wedding_activity')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map(activityFromRow)
  }

  // --- TaskComments --------------------------------------------------
  async listTaskComments(weddingId: ID): Promise<TaskComment[]> {
    const { data, error } = await this.db
      .from('task_comments')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(taskCommentFromRow)
  }

  async createTaskComment(input: TaskCommentInput): Promise<TaskComment> {
    const { data, error } = await this.db
      .from('task_comments')
      .insert(taskCommentToRow(input))
      .select()
      .single()
    if (error) throw error
    return taskCommentFromRow(data)
  }

  async deleteTaskComment(id: ID): Promise<void> {
    const { error } = await this.db.from('task_comments').delete().eq('id', id)
    if (error) throw error
  }

  // --- Members -------------------------------------------------------
  async listMembers(weddingId: ID): Promise<WeddingMember[]> {
    const { data, error } = await this.db.rpc('list_wedding_members', {
      p_wedding: weddingId,
    })
    if (error) throw error
    return (data ?? []).map((r) => ({
      userId: r.user_id,
      email: r.email ?? '',
      displayName: r.display_name ?? '',
      role: r.role as WeddingRoleSnapshot,
      avatarUrl: r.avatar_url ?? undefined,
    }))
  }
}
