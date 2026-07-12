'use client'

import * as React from 'react'

import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  MeerDetails,
  Modal,
  Select,
  Textarea,
  eigennaamInputProps,
} from '@/components/bruiloft/ui'
import { VENDOR_STATUSSEN } from '@/lib/bruiloft/options'
import type { BudgetItem, Vendor, VendorInput } from '@/lib/bruiloft/types'
import { capFirst } from '@/lib/utils'

type NewVendor = Omit<VendorInput, 'weddingId'>

interface VendorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Vendor | null
  budgetItems: BudgetItem[]
  // Zelf beheerde lijst leverancierscategorieën van dit bruidspaar
  categorieen: string[]
  // Custom categorieën die al in gebruik zijn maar niet (meer) beheerd worden
  extraTypes?: string[]
  onSubmit: (data: NewVendor) => void | Promise<void>
}

const NIEUW_SENTINEL = '__nieuw__'

function leeg(categorieen: string[]): NewVendor {
  return {
    naam: '',
    type: categorieen[0] ?? 'overig',
    status: 'te bezoeken',
    contactpersoon: '',
    telefoon: '',
    email: '',
    website: '',
    geoffreerdBedrag: 0,
    notitie: '',
    adres: '',
    afspraakDatum: null,
    afspraakTijd: '',
    budgetItemId: undefined,
  }
}

function vanVendor(v: Vendor): NewVendor {
  return {
    naam: v.naam,
    type: v.type,
    status: v.status,
    contactpersoon: v.contactpersoon,
    telefoon: v.telefoon,
    email: v.email,
    website: v.website,
    geoffreerdBedrag: v.geoffreerdBedrag,
    notitie: v.notitie,
    adres: v.adres,
    afspraakDatum: v.afspraakDatum ?? null,
    afspraakTijd: v.afspraakTijd,
    budgetItemId: v.budgetItemId,
  }
}

export function VendorForm({
  open,
  onOpenChange,
  initial,
  budgetItems,
  categorieen,
  extraTypes = [],
  onSubmit,
}: VendorFormProps) {
  const [form, setForm] = React.useState<NewVendor>(() => leeg(categorieen))
  const [naamFout, setNaamFout] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  // Of de gebruiker een eigen categorienaam intypt
  const [nieuweCategorieModus, setNieuweCategorieModus] = React.useState(false)
  const [nieuweCategorieFout, setNieuweCategorieFout] = React.useState(false)
  const baseline = React.useRef<string>(JSON.stringify(leeg(categorieen)))

  // Alle bekende types: beheerde lijst + al gebruikte afwijkende (legacy) types
  const alleTypes = React.useMemo(() => {
    const extra = extraTypes.filter((t) => !categorieen.includes(t))
    return [...categorieen, ...extra]
  }, [categorieen, extraTypes])

  React.useEffect(() => {
    if (open) {
      const start = initial ? vanVendor(initial) : leeg(categorieen)
      setForm(start)
      baseline.current = JSON.stringify(start)
      setNaamFout(false)
      setDetailsOpen(!!initial)
      // Als het type niet in de bekende lijst staat → custom modus
      setNieuweCategorieModus(!!initial && !alleTypes.includes(start.type))
      setNieuweCategorieFout(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const dirty = JSON.stringify(form) !== baseline.current

  const sluit = (o: boolean) => {
    if (!o && dirty) { setConfirmOpen(true); return }
    onOpenChange(o)
  }

  const set = <K extends keyof NewVendor>(key: K, value: NewVendor[K]) => {
    if (key === 'naam' && naamFout) setNaamFout(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  const handleTypeSelect = (value: string) => {
    if (value === NIEUW_SENTINEL) {
      setNieuweCategorieModus(true)
      set('type', '')
    } else {
      setNieuweCategorieModus(false)
      setNieuweCategorieFout(false)
      set('type', value)
    }
  }

  const verwerk = async (closeAfter: boolean) => {
    if (!form.naam.trim()) {
      setNaamFout(true)
      return
    }
    if (nieuweCategorieModus && !form.type.trim()) {
      setNieuweCategorieFout(true)
      return
    }
    if (saving) return
    setSaving(true)
    try {
      await Promise.resolve(onSubmit({
        ...form,
        naam: form.naam.trim(),
        type: nieuweCategorieModus ? form.type.trim().toLowerCase() : form.type,
        geoffreerdBedrag: Number(form.geoffreerdBedrag) || 0,
      }))
      if (closeAfter) {
        onOpenChange(false)
      } else {
        const leegForm = leeg(categorieen)
        setForm(leegForm)
        baseline.current = JSON.stringify(leegForm)
        setNaamFout(false)
        setNieuweCategorieModus(false)
        setNieuweCategorieFout(false)
      }
    } catch {
      // opslaan mislukt
    } finally {
      setSaving(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    verwerk(true)
  }

  return (
    <>
    <Modal
      open={open}
      onOpenChange={sluit}
      title={initial ? 'Leverancier bewerken' : 'Leverancier toevoegen'}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => sluit(false)}>
            Annuleren
          </Button>
          {!initial ? (
            <Button type="button" variant="secondary" onClick={() => verwerk(false)} loading={saving}>
              Nog een toevoegen
            </Button>
          ) : null}
          <Button type="submit" form="vendor-form" loading={saving}>
            {initial ? 'Opslaan' : 'Toevoegen'}
          </Button>
        </div>
      }
    >
      <form id="vendor-form" onSubmit={submit} className="space-y-4">
        <Field
          label="Naam"
          htmlFor="naam"
          required
          error={naamFout ? 'Vul een naam in' : undefined}
        >
          <Input
            id="naam"
            value={form.naam}
            aria-invalid={naamFout || undefined}
            onChange={(e) => set('naam', e.target.value)}
            {...eigennaamInputProps}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="type">
            {nieuweCategorieModus ? (
              <div className="flex flex-col gap-1.5">
                <Input
                  id="type"
                  placeholder="Bijv. entertainement"
                  value={form.type}
                  aria-invalid={nieuweCategorieFout || undefined}
                  onChange={(e) => {
                    setNieuweCategorieFout(false)
                    set('type', e.target.value)
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    setNieuweCategorieModus(false)
                    setNieuweCategorieFout(false)
                    set('type', categorieen[0] ?? 'overig')
                  }}
                >
                  Kies uit de lijst
                </button>
                {nieuweCategorieFout && (
                  <p className="text-xs text-destructive">Vul een categorienaam in</p>
                )}
              </div>
            ) : (
              <Select
                id="type"
                value={form.type}
                onChange={(e) => handleTypeSelect(e.target.value)}
              >
                {alleTypes.map((t) => (
                  <option key={t} value={t}>
                    {capFirst(t)}
                  </option>
                ))}
                <option disabled>──────────</option>
                <option value={NIEUW_SENTINEL}>Nieuwe categorie…</option>
              </Select>
            )}
          </Field>
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as NewVendor['status'])}
            >
              {VENDOR_STATUSSEN.map((s) => (
                <option key={s} value={s}>
                  {capFirst(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Contactpersoon" htmlFor="cp">
            <Input
              id="cp"
              value={form.contactpersoon}
              onChange={(e) => set('contactpersoon', e.target.value)}
              {...eigennaamInputProps}
            />
          </Field>
          <Field label="Offerteprijs (€)" htmlFor="bedrag">
            <Input
              id="bedrag"
              type="number"
              min={0}
              step="0.01"
              value={form.geoffreerdBedrag || ''}
              onChange={(e) => set('geoffreerdBedrag', Number(e.target.value) || 0)}
            />
          </Field>
        </div>

        <MeerDetails open={detailsOpen} onToggle={() => setDetailsOpen((v) => !v)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefoon" htmlFor="tel">
              <Input id="tel" type="tel" autoComplete="tel" value={form.telefoon} onChange={(e) => set('telefoon', e.target.value)} />
            </Field>
            <Field label="E-mail" htmlFor="mail">
              <Input
                id="mail"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Website" htmlFor="web">
              <Input id="web" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.website} onChange={(e) => set('website', e.target.value)} />
            </Field>
            <Field label="Adres" htmlFor="adres">
              <Input
                id="adres"
                value={form.adres}
                onChange={(e) => set('adres', e.target.value)}
                placeholder="Straat huisnummer, plaats"
              />
            </Field>
          </div>

          {/* Afspraak (bezichtiging/proeverij/gesprek): tijd is optioneel —
              alleen een dag prikken is ook prima. */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Afspraak" htmlFor="afspraak-datum">
              <Input
                id="afspraak-datum"
                type="date"
                value={form.afspraakDatum ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  // Datum wissen wist ook de tijd — een tijd zonder dag is niets.
                  setForm((f) => ({ ...f, afspraakDatum: v || null, afspraakTijd: v ? f.afspraakTijd : '' }))
                }}
              />
            </Field>
            <Field label="Tijd (optioneel)" htmlFor="afspraak-tijd">
              <Input
                id="afspraak-tijd"
                type="time"
                value={form.afspraakTijd}
                disabled={!form.afspraakDatum}
                onChange={(e) => set('afspraakTijd', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Gekoppeld budgetitem" htmlFor="bud">
            <Select
              id="bud"
              value={form.budgetItemId ?? ''}
              onChange={(e) => set('budgetItemId', e.target.value || undefined)}
            >
              <option value="">Geen</option>
              {budgetItems.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.omschrijving || capFirst(b.categorie)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Notitie" htmlFor="not">
            <Textarea
              id="not"
              value={form.notitie}
              onChange={(e) => set('notitie', e.target.value)}
              rows={3}
              placeholder="Offertedetails, indrukken, afspraken…"
            />
          </Field>
        </MeerDetails>
      </form>
    </Modal>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Wijzigingen verwerpen?"
      description="Niet-opgeslagen wijzigingen gaan verloren."
      bevestigLabel="Verwerpen"
      onConfirm={() => onOpenChange(false)}
    />
    </>
  )
}
