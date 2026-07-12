'use client'

import * as React from 'react'

import { Button, Field, Input, Modal } from '@/components/bruiloft/ui'

interface NaamModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  titel: string // "Nieuwe map" of "Hernoemen"
  label: string // veldlabel, bv. "Naam van de map"
  submitLabel: string
  beginwaarde?: string
  onSubmit: (naam: string) => Promise<void>
}

// Eén klein formulier voor alles wat een naam vraagt in de verkenner:
// nieuwe map, map hernoemen, bestand hernoemen.
export function NaamModal({
  open,
  onOpenChange,
  titel,
  label,
  submitLabel,
  beginwaarde = '',
  onSubmit,
}: NaamModalProps) {
  const [naam, setNaam] = React.useState(beginwaarde)
  const [bezig, setBezig] = React.useState(false)
  const [fout, setFout] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setNaam(beginwaarde)
    setFout('')
  }, [open, beginwaarde])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const schoon = naam.trim()
    if (!schoon) return
    setBezig(true)
    setFout('')
    try {
      await onSubmit(schoon)
      onOpenChange(false)
    } catch {
      setFout('Opslaan mislukt — probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={titel} className="sm:max-w-sm">
      <form onSubmit={submit} className="space-y-4">
        <Field label={label} htmlFor="naam-modal-input" error={fout} required>
          <Input
            id="naam-modal-input"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            maxLength={100}
            required
          />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit" loading={bezig} disabled={!naam.trim()}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
