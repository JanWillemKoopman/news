'use client'

import * as React from 'react'

import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/components/bruiloft/ui'
import { GASTTYPES, GUEST_CATEGORIEEN, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import type { Guest, GuestInput } from '@/lib/bruiloft/types'

type NewGuest = Omit<GuestInput, 'weddingId'>

interface GuestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Guest | null
  onSubmit: (data: NewGuest) => void
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

export function GuestForm({ open, onOpenChange, initial, onSubmit }: GuestFormProps) {
  const [form, setForm] = React.useState<NewGuest>(leeg)
  const [naamFout, setNaamFout] = React.useState(false)
  // Baseline om niet-opgeslagen wijzigingen te detecteren bij het sluiten.
  const baseline = React.useRef<string>(JSON.stringify(leeg()))
  const voornaamRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      const start = initial ? vanGuest(initial) : leeg()
      setForm(start)
      baseline.current = JSON.stringify(start)
      setNaamFout(false)
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
      if (!window.confirm('Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt sluiten?'))
        return
    }
    onOpenChange(o)
  }

  // closeAfter=false houdt de modal open en reset het formulier ("nog een toevoegen").
  const verwerk = (closeAfter: boolean) => {
    if (!form.voornaam.trim() && !form.achternaam.trim()) {
      setNaamFout(true)
      return
    }
    onSubmit({
      ...form,
      voornaam: form.voornaam.trim(),
      achternaam: form.achternaam.trim(),
      partnerNaam: form.heeftPartner ? form.partnerNaam.trim() : '',
      aantalKinderen: Number(form.aantalKinderen) || 0,
    })
    if (closeAfter) {
      onOpenChange(false)
    } else {
      const leegForm = leeg()
      setForm(leegForm)
      baseline.current = JSON.stringify(leegForm)
      setNaamFout(false)
      voornaamRef.current?.focus()
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    verwerk(true)
  }

  return (
    <Modal
      open={open}
      onOpenChange={sluit}
      title={initial ? 'Gast bewerken' : 'Gast toevoegen'}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Voornaam"
            htmlFor="vn"
            error={naamFout ? 'Vul minimaal een voor- of achternaam in' : undefined}
          >
            <Input
              id="vn"
              ref={voornaamRef}
              value={form.voornaam}
              aria-invalid={naamFout || undefined}
              onChange={(e) => set('voornaam', e.target.value)}
            />
          </Field>
          <Field label="Achternaam" htmlFor="an">
            <Input
              id="an"
              value={form.achternaam}
              aria-invalid={naamFout || undefined}
              onChange={(e) => set('achternaam', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Categorie" htmlFor="cat">
            <Select
              id="cat"
              value={form.categorie}
              onChange={(e) => set('categorie', e.target.value as NewGuest['categorie'])}
            >
              {GUEST_CATEGORIEEN.map((c) => (
                <option key={c} value={c}>
                  {c}
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
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="RSVP-status" htmlFor="rsvp">
            <Select
              id="rsvp"
              value={form.rsvpStatus}
              onChange={(e) => set('rsvpStatus', e.target.value as NewGuest['rsvpStatus'])}
            >
              {RSVP_STATUSSEN.map((s) => (
                <option key={s} value={s}>
                  {s}
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

        <div className="rounded-xl border border-border p-3">
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

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => sluit(false)}>
            Annuleren
          </Button>
          {!initial ? (
            <Button type="button" variant="secondary" onClick={() => verwerk(false)}>
              Opslaan &amp; nog een toevoegen
            </Button>
          ) : null}
          <Button type="submit">{initial ? 'Opslaan' : 'Toevoegen'}</Button>
        </div>
      </form>
    </Modal>
  )
}
