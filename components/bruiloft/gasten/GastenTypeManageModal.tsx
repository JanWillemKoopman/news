'use client'

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Button, ConfirmDialog, Field, Input, Modal, useToast } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { capFirst } from '@/lib/utils'
import type { Guest } from '@/lib/bruiloft/types'

interface GastenTypeManageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categorieen: string[]
  guests: Guest[]
}

// Zelfde beheerpatroon als BudgetCategoryManageModal/VendorCategoryManageModal:
// bruidsparen beheren hun eigen lijst gasttypes, zodat dag/avond niet de
// enige indeling is die de app toestaat.
export function GastenTypeManageModal({
  open,
  onOpenChange,
  categorieen,
  guests,
}: GastenTypeManageModalProps) {
  const updateWedding = useBruiloftStore((s) => s.updateWedding)
  const { toast } = useToast()
  const [nieuw, setNieuw] = React.useState('')
  const [nieuwFout, setNieuwFout] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [teVerwijderen, setTeVerwijderen] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setNieuw('')
      setNieuwFout(null)
    }
  }, [open])

  const aantalGasten = (naam: string) => guests.filter((g) => g.gasttype === naam).length

  const voegToe = async (e: React.FormEvent) => {
    e.preventDefault()
    const naam = nieuw.trim().toLowerCase()
    if (!naam) return
    if (categorieen.some((c) => c.toLowerCase() === naam)) {
      setNieuwFout('Dit gasttype bestaat al')
      return
    }
    setSaving(true)
    try {
      await updateWedding({ gasttypeCategorieen: [...categorieen, naam] })
      setNieuw('')
      setNieuwFout(null)
    } catch {
      toast({ title: 'Toevoegen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const verwijder = async (naam: string) => {
    try {
      await updateWedding({ gasttypeCategorieen: categorieen.filter((c) => c !== naam) })
      toast({ title: 'Gasttype verwijderd', variant: 'success' })
    } catch {
      toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Gasttypes beheren"
        description="Dag- en avondgasten zijn de standaard, maar je kunt zelf types toevoegen (bijv. ceremonie, kinderen) of verwijderen wat niet past bij jullie bruiloft."
      >
        <div className="space-y-4">
          <form onSubmit={voegToe} className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Nieuw gasttype" htmlFor="nieuw-gasttype" error={nieuwFout ?? undefined}>
                <Input
                  id="nieuw-gasttype"
                  value={nieuw}
                  onChange={(e) => {
                    setNieuwFout(null)
                    setNieuw(e.target.value)
                  }}
                  placeholder="Bijv. ceremonie"
                />
              </Field>
            </div>
            <Button type="submit" loading={saving} disabled={!nieuw.trim()}>
              <Plus className="h-4 w-4" /> Toevoegen
            </Button>
          </form>

          <ul className="max-h-[45vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {categorieen.map((c) => {
              const inGebruik = aantalGasten(c)
              return (
                <li key={c} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{capFirst(c)}</p>
                    {inGebruik > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {inGebruik} gast{inGebruik === 1 ? '' : 'en'}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${c} verwijderen`}
                    disabled={inGebruik > 0}
                    title={
                      inGebruik > 0
                        ? 'Wijs eerst de gasten met dit type een ander gasttype toe'
                        : undefined
                    }
                    onClick={() => setTeVerwijderen(c)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              )
            })}
          </ul>

          <div className="flex justify-end pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Sluiten
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={teVerwijderen !== null}
        onOpenChange={(o) => !o && setTeVerwijderen(null)}
        title="Gasttype verwijderen?"
        description={
          teVerwijderen
            ? `"${capFirst(teVerwijderen)}" wordt niet meer voorgesteld bij nieuwe gasten.`
            : undefined
        }
        bevestigLabel="Verwijderen"
        onConfirm={async () => {
          if (teVerwijderen) await verwijder(teVerwijderen)
        }}
      />
    </>
  )
}
