'use client'

import * as React from 'react'
import { FileText, Plus, Trash2 } from 'lucide-react'

import { Button, ConfirmDialog, Field, Select, useToast } from '@/components/bruiloft/ui'
import { capFirst } from '@/lib/utils'
import { formatDatumKort } from '@/lib/bruiloft/format'
import type { ID, VendorDocument, VendorDocumentSoort } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

const SOORTEN: VendorDocumentSoort[] = ['offerte', 'contract', 'factuur', 'overig']

// Zelfde limiet als de storage-bucket (migratie 0068) — hier alvast checken
// zodat de gebruiker een nette melding krijgt i.p.v. een storage-fout.
const MAX_BYTES = 20 * 1024 * 1024

// Zelfde limiet als de trigger in migratie 0074 — hier alvast checken zodat
// de gebruiker een nette melding krijgt i.p.v. een database-foutmelding.
const MAX_DOCUMENTEN = 10

const TOEGESTANE_EXTENSIES = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx', 'xls', 'xlsx', 'txt']
const ACCEPT = TOEGESTANE_EXTENSIES.map((e) => `.${e}`).join(',')

// Slimme voorzet voor het soort, op basis van de bestandsnaam — de gebruiker
// hoeft dan meestal alleen nog op Opslaan te klikken.
function raadSoort(bestandsnaam: string): VendorDocumentSoort {
  const n = bestandsnaam.toLowerCase()
  if (n.includes('contract') || n.includes('overeenkomst')) return 'contract'
  if (n.includes('factuur') || n.includes('invoice')) return 'factuur'
  if (n.includes('offerte') || n.includes('prijs') || n.includes('quote')) return 'offerte'
  return 'overig'
}

function formatGrootte(bytes: number): string {
  if (bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

interface VendorDocumentenProps {
  vendorId: ID
  kanBewerken: boolean
}

// Documentenkluis-sectie in de leveranciers-detailmodal: offertes, contracten
// en facturen bij deze leverancier bewaren. Bestanden staan in een private
// bucket; downloaden gaat via een kortlevende signed URL uit de store.
export function VendorDocumenten({ vendorId, kanBewerken }: VendorDocumentenProps) {
  const alleDocumenten = useBruiloftStore((s) => s.vendorDocuments)
  const addVendorDocument = useBruiloftStore((s) => s.addVendorDocument)
  const deleteVendorDocument = useBruiloftStore((s) => s.deleteVendorDocument)
  const getVendorDocumentUrl = useBruiloftStore((s) => s.getVendorDocumentUrl)
  const { toast } = useToast()

  const documenten = alleDocumenten.filter((d) => d.vendorId === vendorId)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const [pendingSoort, setPendingSoort] = React.useState<VendorDocumentSoort>('offerte')
  const [uploadt, setUploadt] = React.useState(false)
  const [delDoc, setDelDoc] = React.useState<VendorDocument | null>(null)

  const limietBereikt = documenten.length >= MAX_DOCUMENTEN

  const kiesBestand = (file: File | null) => {
    if (!file) return
    if (limietBereikt) {
      toast({
        title: 'Limiet bereikt',
        description: `Maximaal ${MAX_DOCUMENTEN} documenten per leverancier — verwijder er eerst een.`,
        variant: 'error',
      })
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!TOEGESTANE_EXTENSIES.includes(ext)) {
      toast({
        title: 'Dit bestandstype kan niet',
        description: 'Kies een pdf, foto of Word/Excel-bestand.',
        variant: 'error',
      })
      return
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'Bestand te groot', description: 'Maximaal 20 MB per document.', variant: 'error' })
      return
    }
    setPendingSoort(raadSoort(file.name))
    setPendingFile(file)
  }

  const upload = async () => {
    if (!pendingFile) return
    setUploadt(true)
    try {
      await addVendorDocument(vendorId, pendingFile, pendingSoort)
      setPendingFile(null)
      toast({ title: 'Document opgeslagen', variant: 'success' })
    } catch (e) {
      const limiet = e instanceof Error && e.message.includes('Maximaal 10 documenten')
      toast({
        title: limiet ? 'Limiet bereikt' : 'Uploaden mislukt',
        description: limiet
          ? `Maximaal ${MAX_DOCUMENTEN} documenten per leverancier — verwijder er eerst een.`
          : 'Probeer het opnieuw.',
        variant: 'error',
      })
    } finally {
      setUploadt(false)
    }
  }

  // Signed URL heeft Content-Disposition: attachment (zie createVendorDocumentUrl),
  // dus dit downloadt het bestand i.p.v. het (mogelijk mislukt) in de browser te
  // tonen — zo hoeven we niet per bestandsformaat te regelen dat het weergegeven wordt.
  const download = async (doc: VendorDocument) => {
    try {
      const url = await getVendorDocumentUrl(doc)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.naam
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      toast({ title: 'Downloaden mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  if (documenten.length === 0 && !kanBewerken) return null

  return (
    <div className="border-t border-border pt-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Documenten</p>

      {documenten.length === 0 && !pendingFile ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {kanBewerken
            ? 'Bewaar hier de offertes, contracten en facturen van deze leverancier — als pdf, foto of Word/Excel-bestand. Alleen jullie kunnen ze zien.'
            : 'Hier staan de offertes, contracten en facturen van deze leverancier.'}
        </p>
      ) : null}

      {documenten.length > 0 ? (
        <ul className="mt-2 divide-y divide-border">
          {documenten.map((doc) => {
            const details = [
              capFirst(doc.soort),
              formatDatumKort(doc.createdAt),
              formatGrootte(doc.grootte),
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={doc.id} className="flex items-center gap-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <button
                  type="button"
                  onClick={() => download(doc)}
                  className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block truncate text-sm font-medium text-foreground hover:underline">
                    {doc.naam}
                  </span>
                  <span className="block text-xs text-muted-foreground">{details}</span>
                </button>
                {kanBewerken ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Verwijder ${doc.naam}`}
                    onClick={() => setDelDoc(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      {kanBewerken ? (
        pendingFile ? (
          <div className="mt-3 space-y-3 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {pendingFile.name}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatGrootte(pendingFile.size)}
              </span>
            </div>
            <Field label="Wat voor document is dit?" htmlFor="vd-soort">
              <Select
                id="vd-soort"
                value={pendingSoort}
                onChange={(e) => setPendingSoort(e.target.value as VendorDocumentSoort)}
                disabled={uploadt}
              >
                {SOORTEN.map((s) => (
                  <option key={s} value={s}>
                    {capFirst(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPendingFile(null)} disabled={uploadt}>
                Annuleren
              </Button>
              <Button size="sm" onClick={upload} loading={uploadt}>
                Opslaan
              </Button>
            </div>
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={(e) => {
                kiesBestand(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
              disabled={limietBereikt}
            >
              <Plus className="h-4 w-4" /> Document toevoegen
            </Button>
            {limietBereikt ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Maximaal {MAX_DOCUMENTEN} documenten per leverancier — verwijder er eerst een om een nieuwe toe te voegen.
              </p>
            ) : null}
          </>
        )
      ) : null}

      <ConfirmDialog
        open={delDoc !== null}
        onOpenChange={(o) => !o && setDelDoc(null)}
        title="Document verwijderen?"
        description={delDoc ? `Weet je zeker dat je "${delDoc.naam}" wilt verwijderen?` : undefined}
        onConfirm={async () => {
          if (!delDoc) return
          try {
            await deleteVendorDocument(delDoc.id)
            toast({ title: 'Document verwijderd', variant: 'success' })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />
    </div>
  )
}
