'use client'

import * as React from 'react'

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

const NIEUWE_CATEGORIE_SENTINEL = '__nieuwe_categorie__'
const NIEUW_GASTTYPE_SENTINEL = '__nieuw_gasttype__'

interface GuestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Guest | null
  wedding?: Wedding | null
  // Custom categorieën/gasttypes die al in gebruik zijn bij dit bruidspaar
  extraCategorieen?: string[]
  extraGasttypen?: string[]
  onSubmit: (data: NewGuest) => void | Promise<void>
}

function leeg(): NewGuest {
  return {
    voornaam: '',
    achternaam: '',
    categorie: 'vrienden',
    gasttype: 'daggast',
    rsvpStatus: 'nog niet uitgenodigd',
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

export function GuestForm({
  open,
  onOpenChange,
  initial,
  wedding,
  extraCategorieen = [],
  extraGasttypen = [],
  onSubmit,
}: GuestFormProps) {
  const [form, setForm] = React.useState<NewGuest>(leeg)
  const [naamFout, setNaamFout] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [stap, setStap] = React.useState<1 | 2>(1)
  // Of de gebruiker een eigen categorie/gasttype intypt i.p.v. uit de lijst kiest
  const [nieuweCategorieModus, setNieuweCategorieModus] = React.useState(false)
  const [nieuweCategorieFout, setNieuweCategorieFout] = React.useState(false)
  const [nieuwGasttypeModus, setNieuwGasttypeModus] = React.useState(false)
  const [nieuwGasttypeFout, setNieuwGasttypeFout] = React.useState(false)
  const baseline = React.useRef<string>(JSON.stringify(leeg()))
  const voornaamRef = React.useRef<HTMLInputElement>(null)

  // Alle bekende categorieën/gasttypes: standaard + al gebruikte custom waarden
  const alleCategorieen = React.useMemo(() => {
    const extra = extraCategorieen.filter((c) => !GUEST_CATEGORIEEN.includes(c))
    return [...GUEST_CATEGORIEEN, ...extra]
  }, [extraCategorieen])
  const alleGasttypen = React.useMemo(() => {
    const extra = extraGasttypen.filter((t) => !GASTTYPES.includes(t))
    return [...GASTTYPES, ...extra]
  }, [extraGasttypen])

  React.useEffect(() => {
    if (open) {
      const start = initial ? vanGuest(initial) : leeg()
      setForm(start)
      baseline.current = JSON.stringify(start)
      setNaamFout(false)
      setStap(1)
      setNieuweCategorieModus(!!initial && !alleCategorieen.includes(start.categorie))
      setNieuweCategorieFout(false)
      setNieuwGasttypeModus(!!initial && !alleGasttypen.includes(start.gasttype))
      setNieuwGasttypeFout(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof NewGuest>(key: K, value: NewGuest[K]) => {
    if ((key === 'voornaam' || key === 'achternaam') && naamFout) setNaamFout(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  const dirty = JSON.stringify(form) !== baseline.current

  const sluit = (o: boolean) => {
    if (!o && dirty) {
      setConfirmOpen(true)
      return
    }
    onOpenChange(o)
  }

  const handleCategorieSelect = (value: string) => {
    if (value === NIEUWE_CATEGORIE_SENTINEL) {
      setNieuweCategorieModus(true)
      set('categorie', '')
    } else {
      setNieuweCategorieModus(false)
      setNieuweCategorieFout(false)
      set('categorie', value)
    }
  }

  const handleGasttypeSelect = (value: string) => {
    if (value === NIEUW_GASTTYPE_SENTINEL) {
      setNieuwGasttypeModus(true)
      set('gasttype', '')
    } else {
      setNieuwGasttypeModus(false)
      setNieuwGasttypeFout(false)
      set('gasttype', value)
    }
  }

  const naarStap2 = () => {
    let geblokkeerd = false
    if (!form.voornaam.trim() && !form.achternaam.trim()) {
      setNaamFout(true)
      geblokkeerd = true
    }
    if (nieuweCategorieModus && !form.categorie.trim()) {
      setNieuweCategorieFout(true)
      geblokkeerd = true
    }
    if (nieuwGasttypeModus && !form.gasttype.trim()) {
      setNieuwGasttypeFout(true)
      geblokkeerd = true
    }
    if (geblokkeerd) return
    setStap(2)
  }

  const verwerk = async (closeAfter: boolean) => {
    if (!form.voornaam.trim() && !form.achternaam.trim()) {
      setNaamFout(true)
      setStap(1)
      return
    }
    if (nieuweCategorieModus && !form.categorie.trim()) {
      setNieuweCategorieFout(true)
      setStap(1)
      return
    }
    if (nieuwGasttypeModus && !form.gasttype.trim()) {
      setNieuwGasttypeFout(true)
      setStap(1)
      return
    }
    if (saving) return
    setSaving(true)
    try {
      await Promise.resolve(onSubmit({
        ...form,
        voornaam: form.voornaam.trim(),
        achternaam: form.achternaam.trim(),
        categorie: nieuweCategorieModus ? form.categorie.trim().toLowerCase() : form.categorie,
        gasttype: nieuwGasttypeModus ? form.gasttype.trim().toLowerCase() : form.gasttype,
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
        setStap(1)
        setNieuweCategorieModus(false)
        setNieuweCategorieFout(false)
        setNieuwGasttypeModus(false)
        setNieuwGasttypeFout(false)
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
    if (stap === 1) {
      naarStap2()
    } else {
      void verwerk(true)
    }
  }

  const p1 = wedding?.partner1Naam
  const p2 = wedding?.partner2Naam

  return (
    <>
    <Modal
      open={open}
      onOpenChange={sluit}
      title={initial ? 'Gast bewerken' : 'Gast toevoegen'}
      footer={
        stap === 1 ? (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => sluit(false)}>
              Annuleren
            </Button>
            <Button type="submit" form="guest-form">Volgende</Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setStap(1)}>
              Terug
            </Button>
            {!initial ? (
              <Button type="button" variant="secondary" onClick={() => verwerk(false)} loading={saving}>
                Opslaan &amp; nog een
              </Button>
            ) : null}
            <Button type="submit" form="guest-form" loading={saving}>
              {initial ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        )
      }
    >
      {/* Stap-indicator */}
      <div className="mb-5 flex items-center gap-2">
        <div className="flex flex-1 gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className={cn('h-1 flex-1 rounded-full transition-colors', stap === 2 ? 'bg-primary' : 'bg-border')} />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">Stap {stap} van 2</span>
      </div>

      <form id="guest-form" onSubmit={submit} className="space-y-4">
        {stap === 1 && (
          <>
            {/* ── Stap 1: Naam + Categorie ── */}
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
                  enterKeyHint="next"
                  value={form.voornaam}
                  aria-invalid={naamFout || undefined}
                  onChange={(e) => set('voornaam', e.target.value)}
                  {...eigennaamInputProps}
                />
              </Field>
              <Field label="Achternaam" htmlFor="an">
                <Input
                  id="an"
                  enterKeyHint="next"
                  value={form.achternaam}
                  aria-invalid={naamFout || undefined}
                  onChange={(e) => set('achternaam', e.target.value)}
                  {...eigennaamInputProps}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Categorie" htmlFor="cat">
                {nieuweCategorieModus ? (
                  <div className="flex flex-col gap-1.5">
                    <Input
                      id="cat"
                      placeholder="Bijv. buren"
                      value={form.categorie}
                      aria-invalid={nieuweCategorieFout || undefined}
                      onChange={(e) => {
                        setNieuweCategorieFout(false)
                        set('categorie', e.target.value)
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => {
                        setNieuweCategorieModus(false)
                        setNieuweCategorieFout(false)
                        set('categorie', alleCategorieen[0] ?? 'overig')
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
                    id="cat"
                    value={form.categorie}
                    onChange={(e) => handleCategorieSelect(e.target.value)}
                  >
                    <option value={NIEUWE_CATEGORIE_SENTINEL}>Nieuwe categorie…</option>
                    <option disabled>──────────</option>
                    {alleCategorieen.map((c) => (
                      <option key={c} value={c}>
                        {categorieLabelVoor(c, p1, p2)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Gasttype" htmlFor="type">
                {nieuwGasttypeModus ? (
                  <div className="flex flex-col gap-1.5">
                    <Input
                      id="type"
                      placeholder="Bijv. kind"
                      value={form.gasttype}
                      aria-invalid={nieuwGasttypeFout || undefined}
                      onChange={(e) => {
                        setNieuwGasttypeFout(false)
                        set('gasttype', e.target.value)
                      }}
                    />
                    <button
                      type="button"
                      className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => {
                        setNieuwGasttypeModus(false)
                        setNieuwGasttypeFout(false)
                        set('gasttype', alleGasttypen[0] ?? 'daggast')
                      }}
                    >
                      Kies uit de lijst
                    </button>
                    {nieuwGasttypeFout && (
                      <p className="text-xs text-destructive">Vul een gasttype in</p>
                    )}
                  </div>
                ) : (
                  <Select
                    id="type"
                    value={form.gasttype}
                    onChange={(e) => handleGasttypeSelect(e.target.value)}
                  >
                    <option value={NIEUW_GASTTYPE_SENTINEL}>Nieuw gasttype…</option>
                    <option disabled>──────────</option>
                    {alleGasttypen.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </>
        )}

        {stap === 2 && (
          <>
            {/* ── Stap 2: Details ── */}
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
          </>
        )}
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
