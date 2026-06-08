'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  eigennaamInputProps,
} from '@/components/bruiloft/ui'
import { categorieLabelVoor, GASTTYPES, GUEST_CATEGORIEEN, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import type { Guest, GuestInput, Wedding } from '@/lib/bruiloft/types'
import { cn } from '@/lib/utils'

type NewGuest = Omit<GuestInput, 'weddingId'>

interface GuestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Guest | null
  wedding?: Wedding | null
  onSubmit: (data: NewGuest) => void | Promise<void>
}

function leeg(): NewGuest {
  return {
    voornaam: '',
    achternaam: '',
    categorie: 'vrienden',
    gasttype: 'daggast',
    rsvpStatus: 'uitgenodigd',
    dieetwensen: '',
    heeftPartner: false,
    partnerNaam: '',
    aantalKinderen: 0,
    adres: '',
    notitie: '',
  }
}

function vanGuest(g: Guest): NewGuest {
  return {
    voornaam: g.voornaam,
    achternaam: g.achternaam,
    categorie: g.categorie,
    gasttype: g.gasttype,
    rsvpStatus: g.rsvpStatus,
    dieetwensen: g.dieetwensen,
    heeftPartner: g.heeftPartner,
    partnerNaam: g.partnerNaam,
    aantalKinderen: g.aantalKinderen,
    adres: g.adres,
    notitie: g.notitie,
  }
}

export function GuestForm({ open, onOpenChange, initial, wedding, onSubmit }: GuestFormProps) {
  const [form, setForm] = React.useState<NewGuest>(leeg)
  const [naamFout, setNaamFout] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  // Baseline om niet-opgeslagen wijzigingen te detecteren bij het sluiten.
  const baseline = React.useRef<string>(JSON.stringify(leeg()))
  const voornaamRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      const start = initial ? vanGuest(initial) : leeg()
      setForm(start)
      baseline.current = JSON.stringify(start)
      setNaamFout(false)
      // Details open bij bewerken (alle velden zichtbaar), dicht bij nieuw (snelle invoer).
      setDetailsOpen(!!initial)
    }
  }, [open, initial])

  const set = <K extends keyof NewGuest>(key: K, value: NewGuest[K]) => {
    if ((key === 'voornaam' || key === 'achternaam') && naamFout) setNaamFout(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  const dirty = JSON.stringify(form) !== baseline.current

  // Beschermt tegen onbedoeld verlies van ingevoerde gegevens.
  const sluit = (o: boolean) => {
    if (!o && dirty) {
      setConfirmOpen(true)
      return
    }
    onOpenChange(o)
  }

  // closeAfter=false houdt de modal open en reset het formulier ("nog een toevoegen").
  const verwerk = async (closeAfter: boolean) => {
    if (!form.voornaam.trim() && !form.achternaam.trim()) {
      setNaamFout(true)
      return
    }
    if (saving) return
    setSaving(true)
    try {
      await Promise.resolve(onSubmit({
        ...form,
        voornaam: form.voornaam.trim(),
        achternaam: form.achternaam.trim(),
        partnerNaam: form.heeftPartner ? form.partnerNaam.trim() : '',
        aantalKinderen: Math.max(0, Math.round(Number(form.aantalKinderen) || 0)),
      }))
      if (closeAfter) {
        onOpenChange(false)
      } else {
        const leegForm = leeg()
        setForm(leegForm)
        baseline.current = JSON.stringify(leegForm)
        setNaamFout(false)
        setDetailsOpen(false)
        voornaamRef.current?.focus()
      }
    } catch {
      // opslaan mislukt — modal blijft open, data bewaard
    } finally {
      setSaving(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    verwerk(true)
  }

  const p1 = wedding?.partner1Naam
  const p2 = wedding?.partner2Naam

  return (
    <>
    <Modal
      open={open}
      onOpenChange={sluit}
      title={initial ? 'Gast bewerken' : 'Gast toevoegen'}
    >
      <form onSubmit={submit} className="space-y-4">
        {/* ── Basisgegevens (altijd zichtbaar) ── */}
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Voornaam"
            htmlFor="vn"
            error={naamFout ? 'Vul minimaal een voor- of achternaam in' : undefined}
          >
            <Input
              id="vn"
              ref={voornaamRef}
              autoFocus
              value={form.voornaam}
              aria-invalid={naamFout || undefined}
              onChange={(e) => set('voornaam', e.target.value)}
              {...eigennaamInputProps}
            />
          </Field>
          <Field label="Achternaam" htmlFor="an">
            <Input
              id="an"
              value={form.achternaam}
              aria-invalid={naamFout || undefined}
              onChange={(e) => set('achternaam', e.target.value)}
              {...eigennaamInputProps}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categorie" htmlFor="cat">
            <Select
              id="cat"
              value={form.categorie}
              onChange={(e) => set('categorie', e.target.value as NewGuest['categorie'])}
            >
              {GUEST_CATEGORIEEN.map((c) => (
                <option key={c} value={c}>
                  {categorieLabelVoor(c, p1, p2)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Gasttype" htmlFor="type">
            <Select
              id="type"
              value={form.gasttype}
              onChange={(e) => set('gasttype', e.target.value as NewGuest['gasttype'])}
            >
              {GASTTYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* ── Details (inklapbaar) ── */}
        <div className="rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 rounded-xl transition-colors"
          >
            <span>Meer details</span>
            {detailsOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </button>

          {detailsOpen && (
            <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="RSVP-status" htmlFor="rsvp">
                  <Select
                    id="rsvp"
                    value={form.rsvpStatus}
                    onChange={(e) => set('rsvpStatus', e.target.value as NewGuest['rsvpStatus'])}
                  >
                    {RSVP_STATUSSEN.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Aantal kinderen" htmlFor="kind">
                  <Input
                    id="kind"
                    type="number"
                    min={0}
                    value={form.aantalKinderen || ''}
                    onChange={(e) => set('aantalKinderen', Number(e.target.value) || 0)}
                  />
                </Field>
              </div>

              <div className="rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.heeftPartner}
                    onChange={(e) => set('heeftPartner', e.target.checked)}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  Neemt een partner mee
                </label>
                {form.heeftPartner ? (
                  <Input
                    className="mt-3"
                    placeholder="Naam van de partner (optioneel)"
                    value={form.partnerNaam}
                    onChange={(e) => set('partnerNaam', e.target.value)}
                    {...eigennaamInputProps}
                  />
                ) : null}
              </div>

              <Field label="Dieetwensen" htmlFor="dieet">
                <Input
                  id="dieet"
                  value={form.dieetwensen}
                  onChange={(e) => set('dieetwensen', e.target.value)}
                  placeholder="Bijv. vegetarisch, notenallergie"
                />
              </Field>

              <Field label="Adres" htmlFor="adres">
                <Textarea
                  id="adres"
                  value={form.adres}
                  onChange={(e) => set('adres', e.target.value)}
                  placeholder="Voor de uitnodiging"
                  rows={2}
                />
              </Field>

              <Field label="Notitie" htmlFor="not">
                <Textarea
                  id="not"
                  value={form.notitie}
                  onChange={(e) => set('notitie', e.target.value)}
                  rows={2}
                />
              </Field>
            </div>
          )}
        </div>


        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => sluit(false)}>
            Annuleren
          </Button>
          {!initial ? (
            <Button type="button" variant="secondary" onClick={() => verwerk(false)} loading={saving}>
              Opslaan &amp; nog een toevoegen
            </Button>
          ) : null}
          <Button type="submit" loading={saving}>{initial ? 'Opslaan' : 'Toevoegen'}</Button>
        </div>
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
