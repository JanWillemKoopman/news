'use client'

import { GripVertical, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'

import { Button, Field, Input, Textarea, useToast } from '@/components/bruiloft/ui'
import type { FaqItem } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface Props {
  faq: FaqItem[]
}

export function FaqEditor({ faq }: Props) {
  const updateFaq = useBruiloftStore((s) => s.updateFaq)
  const { toast } = useToast()
  const [items, setItems] = React.useState<FaqItem[]>(faq)
  const { toast } = useToast()

  React.useEffect(() => {
    setItems(faq)
  }, [faq])

  async function stelIn(nieuweItems: FaqItem[]) {
    setItems(nieuweItems)
    try {
      await updateFaq(nieuweItems)
      toast({ title: 'FAQ opgeslagen', variant: 'success' })
    } catch {
      toast({ title: 'Opslaan mislukt', variant: 'error' })
    }
  }

  function voegToe() {
    stelIn([...items, { id: Math.random().toString(36).slice(2), vraag: '', antwoord: '' }])
  }

  function verwijder(id: string) {
    stelIn(items.filter((i) => i.id !== id))
  }

  function updateItem(id: string, patch: Partial<FaqItem>) {
    stelIn(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Veelgestelde vragen en antwoorden voor jullie gasten.
      </p>

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nog geen vragen toegevoegd.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={item.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Vraag {i + 1}</span>
              <button
                onClick={() => verwijder(item.id)}
                className="ml-auto rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Field label="Vraag" htmlFor={`vraag-${item.id}`}>
                <Input
                  id={`vraag-${item.id}`}
                  value={item.vraag}
                  onChange={(e) => updateItem(item.id, { vraag: e.target.value })}
                  placeholder="Bijv. Is er parkeergelegenheid?"
                />
              </Field>
              <Field label="Antwoord" htmlFor={`antwoord-${item.id}`}>
                <Textarea
                  id={`antwoord-${item.id}`}
                  value={item.antwoord}
                  onChange={(e) => updateItem(item.id, { antwoord: e.target.value })}
                  rows={2}
                  placeholder="Bijv. Ja, er is gratis parkeren op het terrein."
                />
              </Field>
            </div>
          </li>
        ))}
      </ul>

      <Button variant="outline" onClick={voegToe} className="w-full">
        <Plus className="h-4 w-4" /> Vraag toevoegen
      </Button>
    </div>
  )
}
