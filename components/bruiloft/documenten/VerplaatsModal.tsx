'use client'

import * as React from 'react'

import { Button, Field, Modal, Select } from '@/components/bruiloft/ui'
import type { DocumentFolder, ID, WeddingDocument } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface VerplaatsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: WeddingDocument | null
}

// Mapkeuze als platte, ingesprongen lijst — diep genoeg voor een
// bruiloftsmap, zonder een volledige boom-widget te hoeven bouwen.
function mapOpties(folders: DocumentFolder[]): { id: ID; label: string }[] {
  const perParent = new Map<ID | null, DocumentFolder[]>()
  for (const f of folders) {
    const lijst = perParent.get(f.parentId) ?? []
    lijst.push(f)
    perParent.set(f.parentId, lijst)
  }
  const resultaat: { id: ID; label: string }[] = []
  const loop = (parentId: ID | null, diepte: number) => {
    for (const f of perParent.get(parentId) ?? []) {
      resultaat.push({ id: f.id, label: `${'   '.repeat(diepte)}${f.naam}` })
      loop(f.id, diepte + 1)
    }
  }
  loop(null, 0)
  return resultaat
}

export function VerplaatsModal({ open, onOpenChange, document }: VerplaatsModalProps) {
  const folders = useBruiloftStore((s) => s.documentFolders)
  const updateWeddingDocument = useBruiloftStore((s) => s.updateWeddingDocument)

  const [doelId, setDoelId] = React.useState<string>('')
  const [bezig, setBezig] = React.useState(false)
  const [fout, setFout] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setDoelId(document?.folderId ?? '')
    setFout('')
  }, [open, document])

  const opties = mapOpties(folders)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!document) return
    setBezig(true)
    setFout('')
    try {
      await updateWeddingDocument(document.id, { folderId: doelId === '' ? null : doelId })
      onOpenChange(false)
    } catch {
      setFout('Verplaatsen mislukt — probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Verplaatsen"
      description={document ? `Kies een map voor "${document.naam}".` : undefined}
      className="sm:max-w-sm"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Naar map" htmlFor="verplaats-doel" error={fout}>
          <Select id="verplaats-doel" value={doelId} onChange={(e) => setDoelId(e.target.value)}>
            <option value="">Hoofdmap</option>
            {opties.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit" loading={bezig}>
            Verplaatsen
          </Button>
        </div>
      </form>
    </Modal>
  )
}
