'use client'

import * as React from 'react'
import {
  CalendarDays,
  Download,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Users2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { GuestForm } from '@/components/bruiloft/gasten/GuestForm'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  StatusBadge,
  useToast,
} from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import { gastTellingen } from '@/lib/bruiloft/derived'
import { GASTTYPES, GUEST_CATEGORIEEN, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Guest } from '@/lib/bruiloft/types'

export default function GastenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const addGuest = useBruiloftStore((s) => s.addGuest)
  const updateGuest = useBruiloftStore((s) => s.updateGuest)
  const deleteGuest = useBruiloftStore((s) => s.deleteGuest)
  const { toast } = useToast()

  const [zoek, setZoek] = React.useState('')
  const [fCategorie, setFCategorie] = React.useState('all')
  const [fType, setFType] = React.useState('all')
  const [fRsvp, setFRsvp] = React.useState('all')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editGuest, setEditGuest] = React.useState<Guest | null>(null)
  const [delGuest, setDelGuest] = React.useState<Guest | null>(null)

  const [rsvpTarget, setRsvpTarget] = React.useState<Guest | null>(null)
  const [rsvpEmail, setRsvpEmail] = React.useState('')
  const [rsvpSending, setRsvpSending] = React.useState(false)

  if (!wedding) return null

  async function sendRsvpEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!rsvpTarget || !wedding) return
    setRsvpSending(true)
    try {
      const res = await fetch('/api/email/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId: rsvpTarget.id, email: rsvpEmail.trim(), weddingId: wedding.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.emailSent) {
        toast({ title: 'RSVP-link verzonden', description: `De RSVP-link is naar ${rsvpEmail.trim()} gemaild.`, variant: 'success' })
      } else {
        toast({ title: 'Verzenden mislukt', description: 'Kon de e-mail niet verzenden. Kopieer de link handmatig.', variant: 'error' })
      }
    } catch {
      toast({ title: 'Verzenden mislukt', description: 'Netwerkfout. Probeer het opnieuw.', variant: 'error' })
    }
    setRsvpSending(false)
    setRsvpTarget(null)
    setRsvpEmail('')
  }

  const t = gastTellingen(guests)

  const gefilterd = guests.filter((g) => {
    if (fCategorie !== 'all' && g.categorie !== fCategorie) return false
    if (fType !== 'all' && g.gasttype !== fType) return false
    if (fRsvp !== 'all' && g.rsvpStatus !== fRsvp) return false
    if (zoek.trim()) {
      const naam = `${g.voornaam} ${g.achternaam}`.toLowerCase()
      if (!naam.includes(zoek.trim().toLowerCase())) return false
    }
    return true
  })

  const openNieuw = () => {
    setEditGuest(null)
    setFormOpen(true)
  }
  const openBewerk = (g: Guest) => {
    setEditGuest(g)
    setFormOpen(true)
  }

  const exporteer = () => {
    downloadCsv(
      'gastenlijst.csv',
      [
        'Voornaam',
        'Achternaam',
        'Categorie',
        'Gasttype',
        'RSVP',
        'Dieetwensen',
        'Partner',
        'Partnernaam',
        'Kinderen',
        'Adres',
        'Notitie',
      ],
      guests.map((g) => [
        g.voornaam,
        g.achternaam,
        g.categorie,
        g.gasttype,
        g.rsvpStatus,
        g.dieetwensen,
        g.heeftPartner ? 'ja' : 'nee',
        g.partnerNaam,
        g.aantalKinderen,
        g.adres,
        g.notitie,
      ])
    )
    toast({ title: 'Gastenlijst geëxporteerd', description: 'gastenlijst.csv is gedownload.', variant: 'success' })
  }

  return (
    <div className="mx-auto max-w-6xl">

      {/* ── Samenvatting ── */}
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Samenvatting
      </p>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SamenvattingCard
          icon={Users2}
          titel="RSVP-reacties"
          stats={[
            { label: 'Bevestigd', waarde: t.bevestigd },
            { label: 'Afgemeld', waarde: t.afgemeld },
            { label: 'Geen reactie', waarde: t.geenReactie },
          ]}
        />
        <SamenvattingCard
          icon={Users}
          titel="Gasttellingen"
          stats={[
            { label: 'Totaal', waarde: t.totaal },
            { label: 'Uitgenodigd', waarde: t.uitgenodigd },
          ]}
        />
        <SamenvattingCard
          icon={CalendarDays}
          titel="Aanwezigheid"
          stats={[
            { label: 'Daggasten', waarde: t.daggasten },
            { label: 'Avondgasten', waarde: t.avondgasten },
          ]}
        />
      </div>

      {/* ── Gastenlijst sectieheader ── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gastenlijst</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Beheer de gastenlijst en houd de reacties bij.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={exporteer} disabled={guests.length === 0}>
            <Download className="h-4 w-4" /> Exporteer gastenlijst
          </Button>
          <Button onClick={openNieuw}>
            <Plus className="h-4 w-4" /> Gast toevoegen
          </Button>
        </div>
      </div>

      {/* ── Gastenlijst container ── */}
      {guests.length === 0 ? (
        <EmptyState
          icon={Users}
          titel="Nog geen gasten"
          beschrijving="Voeg je eerste gast toe om de gastenlijst op te bouwen."
          actie={
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Gast toevoegen
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-white shadow-sm">

          {/* Filter balk – lichtgrijze achtergrond, aansluitend op de tabel */}
          <div className="grid gap-3 border-b border-border bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek op naam…"
                className="pl-9"
              />
            </div>
            <Select value={fCategorie} onChange={(e) => setFCategorie(e.target.value)}>
              <option value="all">Alle categorieën</option>
              {GUEST_CATEGORIEEN.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Select value={fType} onChange={(e) => setFType(e.target.value)}>
              <option value="all">Alle types</option>
              {GASTTYPES.map((tp) => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </Select>
            <Select value={fRsvp} onChange={(e) => setFRsvp(e.target.value)}>
              <option value="all">Alle RSVP-statussen</option>
              {RSVP_STATUSSEN.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>

          {/* Tabel (desktop) */}
          {gefilterd.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Search}
                titel="Geen gasten gevonden"
                beschrijving="Pas je filters of zoekopdracht aan."
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <caption className="sr-only">Gastenlijst met categorie, type en RSVP-status</caption>
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-4 py-3 font-medium">Naam</th>
                      <th scope="col" className="px-4 py-3 font-medium">Categorie</th>
                      <th scope="col" className="px-4 py-3 font-medium">Type</th>
                      <th scope="col" className="px-4 py-3 font-medium">RSVP</th>
                      <th scope="col" className="px-4 py-3 font-medium">Partner</th>
                      <th scope="col" className="px-4 py-3 font-medium">Kinderen</th>
                      <th scope="col" className="px-4 py-3">
                        <span className="sr-only">Acties</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gefilterd.map((g) => (
                      <tr key={g.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {g.voornaam} {g.achternaam}
                          {g.dieetwensen ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {g.dieetwensen}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{g.categorie}</td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{g.gasttype}</td>
                        <td className="px-4 py-3">
                          <StatusBadge kind="rsvp" value={g.rsvpStatus} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {g.heeftPartner ? g.partnerNaam || 'ja' : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{g.aantalKinderen || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {g.rsvpCode ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Stuur RSVP-link"
                                onClick={() => { setRsvpTarget(g); setRsvpEmail('') }}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Bewerken"
                              onClick={() => openBewerk(g)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Verwijderen"
                              onClick={() => setDelGuest(g)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobiel: kaartlijst */}
              <div className="space-y-0 divide-y divide-border md:hidden">
                {gefilterd.map((g) => (
                  <div key={g.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {g.voornaam} {g.achternaam}
                        </p>
                        <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                          {g.categorie} · {g.gasttype}
                        </p>
                      </div>
                      <StatusBadge kind="rsvp" value={g.rsvpStatus} />
                    </div>
                    {g.heeftPartner || g.aantalKinderen > 0 || g.dieetwensen ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {[
                          g.heeftPartner ? `+ partner${g.partnerNaam ? ` (${g.partnerNaam})` : ''}` : null,
                          g.aantalKinderen > 0 ? `${g.aantalKinderen} kind(eren)` : null,
                          g.dieetwensen || null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    ) : null}
                    <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                      {g.rsvpCode ? (
                        <Button variant="ghost" size="sm" onClick={() => { setRsvpTarget(g); setRsvpEmail('') }}>
                          <Mail className="h-4 w-4" /> RSVP-link
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => openBewerk(g)}>
                        <Pencil className="h-4 w-4" /> Bewerken
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Verwijderen" onClick={() => setDelGuest(g)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Voettekst */}
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            {gefilterd.length === guests.length
              ? `${guests.length} gasten weergegeven`
              : `${gefilterd.length} van ${guests.length} gasten weergegeven`}
          </div>
        </div>
      )}

      <GuestForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editGuest}
        onSubmit={async (data) => {
          try {
            if (editGuest) {
              await updateGuest(editGuest.id, data)
              toast({ title: 'Gast bijgewerkt', variant: 'success' })
            } else {
              await addGuest(data)
              toast({ title: 'Gast toegevoegd', variant: 'success' })
            }
          } catch {
            toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />

      <ConfirmDialog
        open={delGuest !== null}
        onOpenChange={(o) => !o && setDelGuest(null)}
        title="Gast verwijderen?"
        description={
          delGuest ? `Weet je zeker dat je ${delGuest.voornaam} ${delGuest.achternaam} wilt verwijderen?` : undefined
        }
        onConfirm={async () => {
          if (!delGuest) return
          try {
            await deleteGuest(delGuest.id)
            toast({ title: 'Gast verwijderd', variant: 'success' })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />

      <Modal
        open={rsvpTarget !== null}
        onOpenChange={(o) => { if (!o) { setRsvpTarget(null); setRsvpEmail('') } }}
        title="RSVP-link e-mailen"
        description={rsvpTarget ? `Stuur de persoonlijke RSVP-link van ${rsvpTarget.voornaam} ${rsvpTarget.achternaam} naar een e-mailadres.` : undefined}
      >
        <form onSubmit={sendRsvpEmail} className="space-y-4">
          <Field label="E-mailadres" htmlFor="rsvp-email">
            <Input
              id="rsvp-email"
              type="email"
              required
              placeholder="naam@voorbeeld.nl"
              value={rsvpEmail}
              onChange={(e) => setRsvpEmail(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setRsvpTarget(null); setRsvpEmail('') }}>
              Annuleren
            </Button>
            <Button type="submit" disabled={rsvpSending}>
              <Mail className="h-4 w-4" />
              {rsvpSending ? 'Bezig…' : 'Versturen'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function SamenvattingCard({
  icon: Icon,
  titel,
  stats,
}: {
  icon: LucideIcon
  titel: string
  stats: { label: string; waarde: number }[]
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <Icon className="h-5 w-5 shrink-0 text-gray-500" />
        <p className="font-semibold text-foreground">{titel}</p>
      </div>
      <div className="space-y-1">
        {stats.map((s) => (
          <p key={s.label} className="text-sm text-muted-foreground">
            {s.label}:{' '}
            <span className="font-medium text-foreground">{s.waarde}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
