'use client'

import * as React from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'

import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  MeerDetails,
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
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const baseline = React.useRef<string>(JSON.stringify(leeg()))
  const { toast } = useToast()
  const termijnenRef = React.useRef(form.betaaltermijnen)
  React.useEffect(() => { termijnenRef.current = form.betaaltermijnen }, [form.betaaltermijnen])

  React.useEffect(() => {
    if (open) {
      const start = initial ? vanItem(initial) : leeg()
      setForm(start)
      baseline.current = JSON.stringify(start)
      setOmsFout(false)
      setDetailsOpen(!!initial)
    }
  }, [open, initial])

  const dirty = JSON.stringify(form) !== baseline.current

  const sluit = (o: boolean) => {
    if (!o && dirty) { setConfirmOpen(true); return }
    onOpenChange(o)
  }

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
    const geschat = Number(form.geschatBedrag) || 0
    const geoffreerd = Number(form.geoffreerdBedrag) || 0
    const betaald = Number(form.betaaldBedrag) || 0
    if (geschat < 0 || geoffreerd < 0 || betaald < 0) {
      toast({ title: 'Bedragen mogen niet negatief zijn', variant: 'error' })
      return
    }
    if (saving) return
    setSaving(true)
    try {
      await Promise.resolve(onSubmit({
        categorie: form.categorie,
        omschrijving: form.omschrijving.trim(),
        geschatBedrag: geschat,
        geoffreerdBedrag: geoffreerd,
        betaaldBedrag: betaald,
        vendorId: form.vendorId || undefined,
        betaaltermijnen: form.betaaltermijnen
          .filter((t) => t.bedrag > 0 || t.vervaldatum)
          .map((t) => ({ ...t, bedrag: Number(t.bedrag) || 0 })),
      }))
      onOpenChange(false)
    } catch {
      // opslaan mislukt — modal blijft open, data bewaard
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Modal
      open={open}
      onOpenChange={sluit}
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

        <MeerDetails open={detailsOpen} onToggle={() => setDetailsOpen((v) => !v)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          {(() => {
            const geschat = Number(form.geschatBedrag) || 0
            const geoffreerd = Number(form.geoffreerdBedrag) || 0
            if (geschat > 0 && geoffreerd > geschat) {
              const verschil = geoffreerd - geschat
              return (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    De offerteprijs is €{verschil.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} hoger dan je schatting.
                  </span>
                </div>
              )
            }
            return null
          })()}

          <div>
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
            <p className="mt-1 text-xs text-muted-foreground">
              Staat een gekoppelde leverancier op &laquo;geboekt&raquo;, dan telt diens geoffreerde
              bedrag automatisch mee als geoffreerd bedrag.
            </p>
          </div>

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
        </MeerDetails>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => sluit(false)}>
            Annuleren
          </Button>
          <Button type="submit" loading={saving}>{initial ? 'Opslaan' : 'Toevoegen'}</Button>
        </div>
      </form>
    </Modal>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Wijzigingen verwerpen?"
      description="Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt sluiten?"
      bevestigLabel="Verwerpen"
      onConfirm={() => onOpenChange(false)}
    />
    </>
  )
}
