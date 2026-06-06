'use client'

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'

import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/components/bruiloft/ui'
import { BUDGET_CATEGORIEEN } from '@/lib/bruiloft/options'
import type { BudgetItem, BudgetItemInput, PaymentTerm, Vendor } from '@/lib/bruiloft/types'

type NewBudgetItem = Omit<BudgetItemInput, 'weddingId'>

interface BudgetItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: BudgetItem | null
  vendors: Vendor[]
  onSubmit: (data: NewBudgetItem) => void | Promise<void>
}

interface FormState {
  categorie: BudgetItem['categorie']
  omschrijving: string
  geschatBedrag: string
  geoffreerdBedrag: string
  betaaldBedrag: string
  vendorId: string
  betaaltermijnen: PaymentTerm[]
}

function leeg(): FormState {
  return {
    categorie: 'locatie',
    omschrijving: '',
    geschatBedrag: '',
    geoffreerdBedrag: '',
    betaaldBedrag: '',
    vendorId: '',
    betaaltermijnen: [],
  }
}

function vanItem(item: BudgetItem): FormState {
  return {
    categorie: item.categorie,
    omschrijving: item.omschrijving,
    geschatBedrag: String(item.geschatBedrag || ''),
    geoffreerdBedrag: String(item.geoffreerdBedrag || ''),
    betaaldBedrag: String(item.betaaldBedrag || ''),
    vendorId: item.vendorId ?? '',
    betaaltermijnen: item.betaaltermijnen,
  }
}

function nieuwId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'term-' + Math.random().toString(36).slice(2)
}

export function BudgetItemForm({
  open,
  onOpenChange,
  initial,
  vendors,
  onSubmit,
}: BudgetItemFormProps) {
  const [form, setForm] = React.useState<FormState>(leeg)
  const [omsFout, setOmsFout] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const { toast } = useToast()
  const termijnenRef = React.useRef(form.betaaltermijnen)
  React.useEffect(() => { termijnenRef.current = form.betaaltermijnen }, [form.betaaltermijnen])

  React.useEffect(() => {
    if (open) {
      setForm(initial ? vanItem(initial) : leeg())
      setOmsFout(false)
    }
  }, [open, initial])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    if (key === 'omschrijving' && omsFout) setOmsFout(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  const setTerm = (id: string, patch: Partial<PaymentTerm>) =>
    setForm((f) => ({
      ...f,
      betaaltermijnen: f.betaaltermijnen.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))

  const addTerm = () =>
    setForm((f) => ({
      ...f,
      betaaltermijnen: [
        ...f.betaaltermijnen,
        { id: nieuwId(), bedrag: 0, vervaldatum: '', betaald: false },
      ],
    }))

  const removeTerm = (id: string) => {
    const removed = termijnenRef.current.find((t) => t.id === id)
    const index = termijnenRef.current.findIndex((t) => t.id === id)
    setForm((f) => ({ ...f, betaaltermijnen: f.betaaltermijnen.filter((t) => t.id !== id) }))
    if (removed) {
      toast({
        title: 'Betaaltermijn verwijderd',
        variant: 'success',
        duration: 5000,
        action: {
          label: 'Ongedaan maken',
          onClick: () => {
            const current = termijnenRef.current
            setForm((f) => ({
              ...f,
              betaaltermijnen: [...current.slice(0, index), removed, ...current.slice(index)],
            }))
          },
        },
      })
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.omschrijving.trim()) {
      setOmsFout(true)
      return
    }
    setSaving(true)
    try {
      await Promise.resolve(onSubmit({
        categorie: form.categorie,
        omschrijving: form.omschrijving.trim(),
        geschatBedrag: Number(form.geschatBedrag) || 0,
        geoffreerdBedrag: Number(form.geoffreerdBedrag) || 0,
        betaaldBedrag: Number(form.betaaldBedrag) || 0,
        vendorId: form.vendorId || undefined,
        betaaltermijnen: form.betaaltermijnen
          .filter((t) => t.bedrag > 0 || t.vervaldatum)
          .map((t) => ({ ...t, bedrag: Number(t.bedrag) || 0 })),
      }))
    } finally {
      setSaving(false)
    }
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Budgetitem bewerken' : 'Budgetitem toevoegen'}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Omschrijving"
          htmlFor="oms"
          required
          error={omsFout ? 'Vul een omschrijving in' : undefined}
        >
          <Input
            id="oms"
            autoFocus
            value={form.omschrijving}
            aria-invalid={omsFout || undefined}
            onChange={(e) => set('omschrijving', e.target.value)}
            placeholder="Bijv. Diner 100 personen"
          />
        </Field>

        <Field label="Categorie" htmlFor="cat">
          <Select
            id="cat"
            value={form.categorie}
            onChange={(e) => set('categorie', e.target.value as FormState['categorie'])}
          >
            {BUDGET_CATEGORIEEN.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Geschat (€)" htmlFor="ges">
            <Input
              id="ges"
              type="number"
              min={0}
              step="0.01"
              value={form.geschatBedrag}
              onChange={(e) => set('geschatBedrag', e.target.value)}
            />
          </Field>
          <Field label="Offerteprijs (€)" htmlFor="gof">
            <Input
              id="gof"
              type="number"
              min={0}
              step="0.01"
              value={form.geoffreerdBedrag}
              onChange={(e) => set('geoffreerdBedrag', e.target.value)}
            />
          </Field>
          <Field label="Betaald (€)" htmlFor="bet">
            <Input
              id="bet"
              type="number"
              min={0}
              step="0.01"
              value={form.betaaldBedrag}
              onChange={(e) => set('betaaldBedrag', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Gekoppelde leverancier" htmlFor="ven">
          <Select id="ven" value={form.vendorId} onChange={(e) => set('vendorId', e.target.value)}>
            <option value="">Geen</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.naam} ({v.type})
              </option>
            ))}
          </Select>
        </Field>
        <p className="-mt-2 text-xs text-muted-foreground">
          Staat een gekoppelde leverancier op &laquo;geboekt&raquo;, dan telt diens geoffreerde
          bedrag automatisch mee als geoffreerd bedrag.
        </p>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Betaaltermijnen</span>
            <Button type="button" variant="ghost" size="sm" onClick={addTerm}>
              <Plus className="h-4 w-4" /> Termijn
            </Button>
          </div>
          {form.betaaltermijnen.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nog geen termijnen toegevoegd.</p>
          ) : (
            <div className="space-y-2">
              {form.betaaltermijnen.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Bedrag"
                    value={t.bedrag || ''}
                    onChange={(e) => setTerm(t.id, { bedrag: Number(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <Input
                    type="date"
                    value={t.vervaldatum}
                    onChange={(e) => setTerm(t.id, { vervaldatum: e.target.value })}
                    className="flex-1"
                  />
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={t.betaald}
                      onChange={(e) => setTerm(t.id, { betaald: e.target.checked })}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    betaald
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Termijn verwijderen"
                    onClick={() => removeTerm(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit" loading={saving}>{initial ? 'Opslaan' : 'Toevoegen'}</Button>
        </div>
      </form>
    </Modal>
  )
}
