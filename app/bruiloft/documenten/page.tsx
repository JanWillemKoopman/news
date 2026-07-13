'use client'

import * as React from 'react'
import {
  ChevronRight,
  Download,
  Folder,
  FolderInput,
  FolderPlus,
  FolderOpen,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { documentenInfo } from '@/components/bruiloft/faqContent'
import { NaamModal } from '@/components/bruiloft/documenten/NaamModal'
import { VerplaatsModal } from '@/components/bruiloft/documenten/VerplaatsModal'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  OverflowMenu,
  SearchInput,
  useToast,
} from '@/components/bruiloft/ui'
import type { OverflowMenuItem } from '@/components/bruiloft/ui'
import {
  DOCUMENT_ACCEPT,
  MAX_DOCUMENT_BYTES,
  STANDAARD_MAPPEN,
  TOEGESTANE_EXTENSIES,
  bestandsIcoon,
  budgetRegel,
  eigenRegel,
  formatGrootte,
  leveranciersRegel,
  zoekMatch,
  type DocumentRegel,
} from '@/lib/bruiloft/documenten'
import { formatDatumKort } from '@/lib/bruiloft/format'
import { canEdit } from '@/lib/bruiloft/permissions'
import type { DocumentFolder, ID, WeddingDocument } from '@/lib/bruiloft/types'
import { capFirst } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Waar de verkenner "staat": in een eigen map (folderId null = hoofdmap) of
// in een van de automatische systeemmappen die de leveranciers- en
// budgetdocumenten spiegelen.
type Locatie =
  | { type: 'eigen'; folderId: ID | null }
  | { type: 'leveranciers'; vendorId: ID | null }
  | { type: 'budget'; itemId: ID | null }

const HOOFDMAP: Locatie = { type: 'eigen', folderId: null }

export default function DocumentenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const documentFolders = useBruiloftStore((s) => s.documentFolders)
  const weddingDocuments = useBruiloftStore((s) => s.weddingDocuments)
  const vendorDocuments = useBruiloftStore((s) => s.vendorDocuments)
  const budgetItemDocuments = useBruiloftStore((s) => s.budgetItemDocuments)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const permissions = useBruiloftStore((s) => s.permissions)

  const uploadDocument = useBruiloftStore((s) => s.uploadDocument)
  const addDocumentFolder = useBruiloftStore((s) => s.addDocumentFolder)
  const renameDocumentFolder = useBruiloftStore((s) => s.renameDocumentFolder)
  const deleteDocumentFolder = useBruiloftStore((s) => s.deleteDocumentFolder)
  const updateWeddingDocument = useBruiloftStore((s) => s.updateWeddingDocument)
  const deleteWeddingDocument = useBruiloftStore((s) => s.deleteWeddingDocument)
  const getWeddingDocumentUrl = useBruiloftStore((s) => s.getWeddingDocumentUrl)
  const getVendorDocumentUrl = useBruiloftStore((s) => s.getVendorDocumentUrl)
  const getBudgetItemDocumentUrl = useBruiloftStore((s) => s.getBudgetItemDocumentUrl)

  const { toast } = useToast()
  const kanBewerken = canEdit(permissions, 'documenten')

  const [locatie, setLocatie] = React.useState<Locatie>(HOOFDMAP)
  const [zoek, setZoek] = React.useState('')
  const [uploadt, setUploadt] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [nieuweMapOpen, setNieuweMapOpen] = React.useState(false)
  const [hernoemMap, setHernoemMap] = React.useState<DocumentFolder | null>(null)
  const [verwijderMap, setVerwijderMap] = React.useState<DocumentFolder | null>(null)
  const [hernoemDoc, setHernoemDoc] = React.useState<WeddingDocument | null>(null)
  const [verplaatsDoc, setVerplaatsDoc] = React.useState<WeddingDocument | null>(null)
  const [verwijderDoc, setVerwijderDoc] = React.useState<WeddingDocument | null>(null)

  // Uploaden kan alleen in een eigen map — de systeemmappen vullen zichzelf.
  const kanHierUploaden = kanBewerken && locatie.type === 'eigen'

  // Pagina-brede dropzone (zelfde patroon als het moodboard): bestanden
  // ergens op de pagina laten vallen uploadt ze in de huidige map.
  const [dragTeller, setDragTeller] = React.useState(0)
  const dragActief = dragTeller > 0
  const uploadFilesRef = React.useRef<(files: File[]) => void>(() => {})

  React.useEffect(() => {
    if (!kanBewerken) return
    function bevatBestanden(e: DragEvent) {
      return Array.from(e.dataTransfer?.types ?? []).includes('Files')
    }
    function onEnter(e: DragEvent) {
      if (!bevatBestanden(e)) return
      e.preventDefault()
      setDragTeller((n) => n + 1)
    }
    function onLeave(e: DragEvent) {
      if (!bevatBestanden(e)) return
      setDragTeller((n) => Math.max(0, n - 1))
    }
    function onOver(e: DragEvent) {
      if (!bevatBestanden(e)) return
      e.preventDefault()
    }
    function onDrop(e: DragEvent) {
      if (!bevatBestanden(e)) return
      e.preventDefault()
      setDragTeller(0)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length > 0) uploadFilesRef.current(files)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [kanBewerken])

  if (!wedding) return null

  // --- Naslag: namen van leveranciers/budgetposten -----------------------
  const vendorNaam = (id: ID) => vendors.find((v) => v.id === id)?.naam ?? 'Leverancier'
  const budgetNaam = (id: ID) => {
    const item = budgetItems.find((b) => b.id === id)
    return item ? item.omschrijving || capFirst(item.categorie) : 'Budgetpost'
  }
  const mapNaam = (id: ID | null) => documentFolders.find((f) => f.id === id)?.naam ?? 'Hoofdmap'

  // Pad van een eigen map als leesbare tekst ("Contracten / Locatie").
  const mapPad = (folderId: ID | null): string => {
    const delen: string[] = []
    let huidig = folderId
    while (huidig) {
      const f = documentFolders.find((x) => x.id === huidig)
      if (!f) break
      delen.unshift(f.naam)
      huidig = f.parentId
    }
    return delen.length > 0 ? delen.join(' / ') : 'Hoofdmap'
  }

  // --- Uploaden -----------------------------------------------------------
  const uploadFiles = async (files: File[]) => {
    if (!kanHierUploaden) {
      toast({
        title: 'Hier kan niet geüpload worden',
        description: 'Deze map vult zichzelf automatisch — kies een eigen map en probeer opnieuw.',
        variant: 'error',
      })
      return
    }
    const doelMap = locatie.type === 'eigen' ? locatie.folderId : null
    const geldig: File[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!TOEGESTANE_EXTENSIES.includes(ext)) {
        toast({
          title: `"${file.name}" kan niet`,
          description: 'Kies een pdf, foto of Word/Excel-bestand.',
          variant: 'error',
        })
        continue
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        toast({ title: `"${file.name}" is te groot`, description: 'Maximaal 20 MB per document.', variant: 'error' })
        continue
      }
      geldig.push(file)
    }
    if (geldig.length === 0) return
    setUploadt(true)
    let gelukt = 0
    try {
      for (const file of geldig) {
        try {
          await uploadDocument(file, doelMap)
          gelukt += 1
        } catch (e) {
          const limiet = e instanceof Error && e.message.includes('Maximaal 200 documenten')
          toast({
            title: limiet ? 'Limiet bereikt' : `Uploaden van "${file.name}" mislukt`,
            description: limiet
              ? 'Maximaal 200 documenten per bruiloft — verwijder er eerst een.'
              : 'Probeer het opnieuw.',
            variant: 'error',
          })
          if (limiet) break
        }
      }
      if (gelukt > 0) {
        toast({
          title: gelukt === 1 ? 'Document opgeslagen' : `${gelukt} documenten opgeslagen`,
          variant: 'success',
        })
      }
    } finally {
      setUploadt(false)
    }
  }
  uploadFilesRef.current = uploadFiles

  // --- Downloaden (per bron zijn eigen signed URL) ------------------------
  const download = async (regel: DocumentRegel) => {
    try {
      const url = regel.eigen
        ? await getWeddingDocumentUrl(regel.eigen)
        : regel.leverancier
          ? await getVendorDocumentUrl(regel.leverancier)
          : regel.budget
            ? await getBudgetItemDocumentUrl(regel.budget)
            : null
      if (!url) return
      const a = document.createElement('a')
      a.href = url
      a.download = regel.naam
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      toast({ title: 'Downloaden mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  // --- Alles doorzoekbaar: eigen bestanden + systeemmappen ----------------
  const alleRegels: DocumentRegel[] = [
    ...weddingDocuments.map((d) => eigenRegel(d, mapPad(d.folderId))),
    ...vendorDocuments.map((d) => leveranciersRegel(d, vendorNaam(d.vendorId))),
    ...budgetItemDocuments.map((d) => budgetRegel(d, budgetNaam(d.budgetItemId))),
  ]
  const zoekterm = zoek.trim()
  const zoekResultaten = zoekterm
    ? alleRegels.filter((r) => zoekMatch(r.naam, zoekterm) || zoekMatch(r.locatie, zoekterm))
    : []
  const zoekMappen = zoekterm
    ? documentFolders.filter((f) => zoekMatch(f.naam, zoekterm))
    : []

  const isLeeg =
    documentFolders.length === 0 &&
    weddingDocuments.length === 0 &&
    vendorDocuments.length === 0 &&
    budgetItemDocuments.length === 0

  const maakStandaardMappen = async () => {
    try {
      for (const naam of STANDAARD_MAPPEN) {
        await addDocumentFolder(naam, null)
      }
      toast({ title: 'Mappen aangemaakt', description: 'Een startpunt — hernoemen of verwijderen kan altijd.', variant: 'success' })
    } catch {
      toast({ title: 'Mappen aanmaken mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  // --- Broodkruimelpad -----------------------------------------------------
  const kruimels: { label: string; naar: Locatie }[] = [{ label: 'Documenten', naar: HOOFDMAP }]
  if (locatie.type === 'eigen' && locatie.folderId) {
    const keten: DocumentFolder[] = []
    let huidig: ID | null = locatie.folderId
    while (huidig) {
      const f = documentFolders.find((x) => x.id === huidig)
      if (!f) break
      keten.unshift(f)
      huidig = f.parentId
    }
    for (const f of keten) kruimels.push({ label: f.naam, naar: { type: 'eigen', folderId: f.id } })
  } else if (locatie.type === 'leveranciers') {
    kruimels.push({ label: 'Leveranciers', naar: { type: 'leveranciers', vendorId: null } })
    if (locatie.vendorId) {
      kruimels.push({ label: vendorNaam(locatie.vendorId), naar: locatie })
    }
  } else if (locatie.type === 'budget') {
    kruimels.push({ label: 'Budget', naar: { type: 'budget', itemId: null } })
    if (locatie.itemId) {
      kruimels.push({ label: budgetNaam(locatie.itemId), naar: locatie })
    }
  }

  return (
    <div className="relative mx-auto max-w-3xl pb-24 min-h-screen">
      <PageHeader
        titel="Documenten"
        info={<PageInfoButton {...documentenInfo} />}
        primaryActie={
          kanBewerken ? (
            <Button onClick={() => fileInputRef.current?.click()} loading={uploadt} disabled={!kanHierUploaden}>
              <Upload className="h-4 w-4" /> Uploaden
            </Button>
          ) : undefined
        }
        meerActies={
          kanBewerken
            ? [
                {
                  label: 'Nieuwe map',
                  icon: FolderPlus,
                  onClick: () => setNieuweMapOpen(true),
                  disabled: locatie.type !== 'eigen',
                },
              ]
            : undefined
        }
        fab={
          kanHierUploaden
            ? { label: 'Document uploaden', onClick: () => fileInputRef.current?.click() }
            : undefined
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        multiple
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length > 0) void uploadFiles(files)
        }}
      />

      {isLeeg ? (
        <EmptyState
          icon={FolderOpen}
          titel="Nog geen documenten verzameld"
          beschrijving={
            kanBewerken
              ? 'Bewaar hier alles rond de bruiloft op één plek — contracten, offertes, speeches, draaiboeken. Documenten die je bij een leverancier of budgetpost bewaart, verschijnen hier vanzelf.'
              : 'Er staan nog geen documenten in de documentenmap.'
          }
          actie={
            kanBewerken ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={maakStandaardMappen}>
                  <FolderPlus className="h-4 w-4" /> Maak standaardmappen
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Upload een document
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <SearchInput
            value={zoek}
            onValueChange={setZoek}
            placeholder="Zoek in alle documenten…"
            aria-label="Zoek in alle documenten"
          />

          {zoekterm ? (
            <ZoekResultaten
              mappen={zoekMappen}
              regels={zoekResultaten}
              onOpenMap={(f) => {
                setZoek('')
                setLocatie({ type: 'eigen', folderId: f.id })
              }}
              onDownload={download}
            />
          ) : (
            <>
              {/* Broodkruimelpad — alleen tonen zodra je ergens "in" zit. */}
              {kruimels.length > 1 ? (
                <nav aria-label="Mappad" className="flex flex-wrap items-center gap-1 text-sm">
                  {kruimels.map((k, i) => (
                    <React.Fragment key={i}>
                      {i > 0 ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> : null}
                      {i === kruimels.length - 1 ? (
                        <span className="font-medium text-foreground">{k.label}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setLocatie(k.naar)}
                          className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {k.label}
                        </button>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              ) : null}

              <MapInhoud
                locatie={locatie}
                setLocatie={setLocatie}
                kanBewerken={kanBewerken}
                vendorNaam={vendorNaam}
                budgetNaam={budgetNaam}
                onDownload={download}
                onHernoemMap={setHernoemMap}
                onVerwijderMap={setVerwijderMap}
                onHernoemDoc={setHernoemDoc}
                onVerplaatsDoc={setVerplaatsDoc}
                onVerwijderDoc={setVerwijderDoc}
              />
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <NaamModal
        open={nieuweMapOpen}
        onOpenChange={setNieuweMapOpen}
        titel="Nieuwe map"
        label="Naam van de map"
        submitLabel="Aanmaken"
        onSubmit={async (naam) => {
          await addDocumentFolder(naam, locatie.type === 'eigen' ? locatie.folderId : null)
        }}
      />
      <NaamModal
        open={hernoemMap !== null}
        onOpenChange={(o) => !o && setHernoemMap(null)}
        titel="Map hernoemen"
        label="Naam van de map"
        submitLabel="Opslaan"
        beginwaarde={hernoemMap?.naam ?? ''}
        onSubmit={async (naam) => {
          if (hernoemMap) await renameDocumentFolder(hernoemMap.id, naam)
        }}
      />
      <NaamModal
        open={hernoemDoc !== null}
        onOpenChange={(o) => !o && setHernoemDoc(null)}
        titel="Bestand hernoemen"
        label="Bestandsnaam"
        submitLabel="Opslaan"
        beginwaarde={hernoemDoc?.naam ?? ''}
        onSubmit={async (naam) => {
          if (hernoemDoc) await updateWeddingDocument(hernoemDoc.id, { naam })
        }}
      />
      <VerplaatsModal
        open={verplaatsDoc !== null}
        onOpenChange={(o) => !o && setVerplaatsDoc(null)}
        document={verplaatsDoc}
      />
      <ConfirmDialog
        open={verwijderMap !== null}
        onOpenChange={(o) => !o && setVerwijderMap(null)}
        title="Map verwijderen?"
        description={
          verwijderMap
            ? `"${verwijderMap.naam}" wordt verwijderd. Bestanden in deze map worden niet weggegooid — die verhuizen naar de hoofdmap.`
            : undefined
        }
        onConfirm={async () => {
          if (!verwijderMap) return
          try {
            await deleteDocumentFolder(verwijderMap.id)
            setLocatie(HOOFDMAP)
            toast({ title: 'Map verwijderd', variant: 'success' })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />
      <ConfirmDialog
        open={verwijderDoc !== null}
        onOpenChange={(o) => !o && setVerwijderDoc(null)}
        title="Document verwijderen?"
        description={verwijderDoc ? `Weet je zeker dat je "${verwijderDoc.naam}" wilt verwijderen?` : undefined}
        onConfirm={async () => {
          if (!verwijderDoc) return
          try {
            await deleteWeddingDocument(verwijderDoc.id)
            toast({ title: 'Document verwijderd', variant: 'success' })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />

      {/* Dropzone-overlay: puur visuele feedback, het droppen zelf wordt op
          window-niveau afgehandeld (zie useEffect hierboven). */}
      {dragActief ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-rhino-950/40 backdrop-blur-[2px]">
          <div className="rounded-2xl border-2 border-dashed border-white bg-rhino-900/80 px-8 py-6 text-center text-white shadow-2xl">
            <Upload className="mx-auto h-8 w-8" aria-hidden />
            <p className="mt-2 text-lg font-medium">
              {kanHierUploaden ? 'Laat los om te uploaden' : 'Ga eerst naar een eigen map'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ─── Inhoud van de huidige map ───────────────────────────────────────────────

function MapInhoud({
  locatie,
  setLocatie,
  kanBewerken,
  vendorNaam,
  budgetNaam,
  onDownload,
  onHernoemMap,
  onVerwijderMap,
  onHernoemDoc,
  onVerplaatsDoc,
  onVerwijderDoc,
}: {
  locatie: Locatie
  setLocatie: (l: Locatie) => void
  kanBewerken: boolean
  vendorNaam: (id: ID) => string
  budgetNaam: (id: ID) => string
  onDownload: (regel: DocumentRegel) => void
  onHernoemMap: (f: DocumentFolder) => void
  onVerwijderMap: (f: DocumentFolder) => void
  onHernoemDoc: (d: WeddingDocument) => void
  onVerplaatsDoc: (d: WeddingDocument) => void
  onVerwijderDoc: (d: WeddingDocument) => void
}) {
  const documentFolders = useBruiloftStore((s) => s.documentFolders)
  const weddingDocuments = useBruiloftStore((s) => s.weddingDocuments)
  const vendorDocuments = useBruiloftStore((s) => s.vendorDocuments)
  const budgetItemDocuments = useBruiloftStore((s) => s.budgetItemDocuments)

  const rijen: React.ReactNode[] = []

  if (locatie.type === 'eigen') {
    // Systeemmappen alleen in de hoofdmap, bovenaan — dit is dé belofte van
    // de pagina: wat je elders al bewaarde, staat hier ook.
    if (locatie.folderId === null) {
      if (vendorDocuments.length > 0) {
        rijen.push(
          <MapRij
            key="sys-leveranciers"
            naam="Leveranciers"
            details={`${vendorDocuments.length} ${vendorDocuments.length === 1 ? 'document' : 'documenten'} · vult zichzelf`}
            onOpen={() => setLocatie({ type: 'leveranciers', vendorId: null })}
          />
        )
      }
      if (budgetItemDocuments.length > 0) {
        rijen.push(
          <MapRij
            key="sys-budget"
            naam="Budget"
            details={`${budgetItemDocuments.length} ${budgetItemDocuments.length === 1 ? 'document' : 'documenten'} · vult zichzelf`}
            onOpen={() => setLocatie({ type: 'budget', itemId: null })}
          />
        )
      }
    }

    const mappen = documentFolders.filter((f) => f.parentId === locatie.folderId)
    for (const f of mappen) {
      const aantal =
        weddingDocuments.filter((d) => d.folderId === f.id).length +
        documentFolders.filter((x) => x.parentId === f.id).length
      rijen.push(
        <MapRij
          key={f.id}
          naam={f.naam}
          details={aantal === 0 ? 'Leeg' : `${aantal} ${aantal === 1 ? 'item' : 'items'}`}
          onOpen={() => setLocatie({ type: 'eigen', folderId: f.id })}
          menu={
            kanBewerken
              ? [
                  { label: 'Hernoemen', icon: Pencil, onClick: () => onHernoemMap(f) },
                  { label: 'Verwijderen', icon: Trash2, danger: true, onClick: () => onVerwijderMap(f) },
                ]
              : undefined
          }
        />
      )
    }

    const bestanden = weddingDocuments.filter((d) => d.folderId === locatie.folderId)
    for (const d of bestanden) {
      const regel = eigenRegel(d, '')
      rijen.push(
        <BestandRij
          key={d.id}
          regel={regel}
          details={[formatGrootte(d.grootte), formatDatumKort(d.createdAt)].filter(Boolean).join(' · ')}
          onDownload={() => onDownload(regel)}
          menu={
            kanBewerken
              ? [
                  { label: 'Downloaden', icon: Download, onClick: () => onDownload(regel) },
                  { label: 'Hernoemen', icon: Pencil, onClick: () => onHernoemDoc(d) },
                  { label: 'Verplaatsen', icon: FolderInput, onClick: () => onVerplaatsDoc(d) },
                  { label: 'Verwijderen', icon: Trash2, danger: true, onClick: () => onVerwijderDoc(d) },
                ]
              : [{ label: 'Downloaden', icon: Download, onClick: () => onDownload(regel) }]
          }
        />
      )
    }

    if (rijen.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Deze map is nog leeg. Upload een document of sleep een bestand hierheen.
        </p>
      )
    }
  }

  if (locatie.type === 'leveranciers') {
    if (locatie.vendorId === null) {
      // Eén submap per leverancier die daadwerkelijk documenten heeft.
      const perVendor = new Map<ID, number>()
      for (const d of vendorDocuments) perVendor.set(d.vendorId, (perVendor.get(d.vendorId) ?? 0) + 1)
      const gesorteerd = Array.from(perVendor.entries()).sort((a, b) =>
        vendorNaam(a[0]).localeCompare(vendorNaam(b[0]), 'nl')
      )
      for (const [vendorId, aantal] of gesorteerd) {
        rijen.push(
          <MapRij
            key={vendorId}
            naam={vendorNaam(vendorId)}
            details={`${aantal} ${aantal === 1 ? 'document' : 'documenten'}`}
            onOpen={() => setLocatie({ type: 'leveranciers', vendorId })}
          />
        )
      }
    } else {
      for (const d of vendorDocuments.filter((x) => x.vendorId === locatie.vendorId)) {
        const regel = leveranciersRegel(d, vendorNaam(d.vendorId))
        rijen.push(
          <BestandRij
            key={d.id}
            regel={regel}
            details={[capFirst(d.soort), formatGrootte(d.grootte), formatDatumKort(d.createdAt)]
              .filter(Boolean)
              .join(' · ')}
            onDownload={() => onDownload(regel)}
            menu={[{ label: 'Downloaden', icon: Download, onClick: () => onDownload(regel) }]}
          />
        )
      }
    }
  }

  if (locatie.type === 'budget') {
    if (locatie.itemId === null) {
      const perItem = new Map<ID, number>()
      for (const d of budgetItemDocuments) perItem.set(d.budgetItemId, (perItem.get(d.budgetItemId) ?? 0) + 1)
      const gesorteerd = Array.from(perItem.entries()).sort((a, b) =>
        budgetNaam(a[0]).localeCompare(budgetNaam(b[0]), 'nl')
      )
      for (const [itemId, aantal] of gesorteerd) {
        rijen.push(
          <MapRij
            key={itemId}
            naam={budgetNaam(itemId)}
            details={`${aantal} ${aantal === 1 ? 'document' : 'documenten'}`}
            onOpen={() => setLocatie({ type: 'budget', itemId })}
          />
        )
      }
    } else {
      for (const d of budgetItemDocuments.filter((x) => x.budgetItemId === locatie.itemId)) {
        const regel = budgetRegel(d, budgetNaam(d.budgetItemId))
        rijen.push(
          <BestandRij
            key={d.id}
            regel={regel}
            details={[capFirst(d.soort), formatGrootte(d.grootte), formatDatumKort(d.createdAt)]
              .filter(Boolean)
              .join(' · ')}
            onDownload={() => onDownload(regel)}
            menu={[{ label: 'Downloaden', icon: Download, onClick: () => onDownload(regel) }]}
          />
        )
      }
    }
  }

  return (
    <div className="space-y-3">
      {locatie.type !== 'eigen' ? (
        <p className="text-sm text-muted-foreground">
          Deze map vult zichzelf met de documenten die je bij{' '}
          {locatie.type === 'leveranciers' ? 'jullie leveranciers' : 'jullie budgetposten'} bewaart —
          beheren doe je daar.
        </p>
      ) : null}
      <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">{rijen}</ul>
    </div>
  )
}

// ─── Zoekresultaten (over alles heen) ────────────────────────────────────────

function ZoekResultaten({
  mappen,
  regels,
  onOpenMap,
  onDownload,
}: {
  mappen: DocumentFolder[]
  regels: DocumentRegel[]
  onOpenMap: (f: DocumentFolder) => void
  onDownload: (regel: DocumentRegel) => void
}) {
  if (mappen.length === 0 && regels.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Niets gevonden. Zoek op een bestandsnaam, leverancier of mapnaam.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
      {mappen.map((f) => (
        <MapRij key={`map-${f.id}`} naam={f.naam} details="Map" onOpen={() => onOpenMap(f)} />
      ))}
      {regels.map((r) => (
        <BestandRij
          key={r.key}
          regel={r}
          details={[r.locatie, formatGrootte(r.grootte)].filter(Boolean).join(' · ')}
          onDownload={() => onDownload(r)}
          menu={[{ label: 'Downloaden', icon: Download, onClick: () => onDownload(r) }]}
        />
      ))}
    </ul>
  )
}

// ─── Rijen ───────────────────────────────────────────────────────────────────

function MapRij({
  naam,
  details,
  onOpen,
  menu,
}: {
  naam: string
  details: string
  onOpen: () => void
  menu?: OverflowMenuItem[]
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Folder className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium text-foreground hover:underline">{naam}</span>
        <span className="block text-xs text-muted-foreground">{details}</span>
      </button>
      {menu && menu.length > 0 ? <OverflowMenu label={`Acties voor map ${naam}`} items={menu} /> : null}
    </li>
  )
}

function BestandRij({
  regel,
  details,
  onDownload,
  menu,
}: {
  regel: DocumentRegel
  details: string
  onDownload: () => void
  menu: OverflowMenuItem[]
}) {
  const Icoon = bestandsIcoon(regel.naam, regel.mimeType)
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Icoon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      <button
        type="button"
        onClick={onDownload}
        className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium text-foreground hover:underline">{regel.naam}</span>
        {details ? <span className="block text-xs text-muted-foreground">{details}</span> : null}
      </button>
      <OverflowMenu label={`Acties voor ${regel.naam}`} items={menu} />
    </li>
  )
}
