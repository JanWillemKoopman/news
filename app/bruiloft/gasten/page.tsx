'use client'

import * as React from 'react'
import { Check, Copy, Download, Mail, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'

import { GuestForm } from '@/components/bruiloft/gasten/GuestForm'
import { GastenFilters } from '@/components/bruiloft/gasten/GastenFilters'
import { GastenStatsStrip } from '@/components/bruiloft/gasten/GastenStatsStrip'
import { PageHeader } from '@/components/bruiloft/PageHeader'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  OverflowMenu,
  useToast,
} from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import { RSVP_STATUSSEN } from '@/lib/bruiloft/options'
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
  const [gekopieerd, setGekopieerd] = React.useState<string | null>(null)
  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => { setOrigin(window.location.origin) }, [])

  if (!wedding) return null

  const kopieer = async (tekst: string, id: string) => {
    try {
      await navigator.clipboard.writeText(tekst)
      setGekopieerd(id)
      setTimeout(() => setGekopieerd(null), 1500)
    } catch {
      // klembord niet beschikbaar
    }
  }

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

  const zichtbaar = [...gefilterd].sort((a, b) =>
    (a.achternaam || '').localeCompare(b.achternaam || '', 'nl') ||
    a.voornaam.localeCompare(b.voornaam, 'nl')
  )

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
    <div className="mx-auto max-w-6xl pb-24">
      <PageHeader
        titel="Gastenlijst"
        beschrijving="Beheer de gastenlijst en houd de reacties bij."
        actie={
          <>
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Gast toevoegen
            </Button>
            <OverflowMenu
              items={[
                {
                  label: 'Exporteer gastenlijst',
                  icon: Download,
                  onClick: exporteer,
                  disabled: guests.length === 0,
                },
              ]}
            />
          </>
        }
      />

      {guests.length > 0 ? <GastenStatsStrip guests={guests} /> : null}

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
        <>
          <GastenFilters
            zoek={zoek}
            onZoek={setZoek}
            categorie={fCategorie}
            onCategorie={setFCategorie}
            type={fType}
            onType={setFType}
            rsvp={fRsvp}
            onRsvp={setFRsvp}
          />
          <div className="rounded-lg border border-border bg-white shadow-sm">

          {/* Tabel (desktop) */}
          {gefilterd.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Search}
                titel="Geen gasten gevonden"
                beschrijving="Geen gasten komen overeen met de huidige filters of zoekopdracht."
                actie={
                  <Button variant="outline" size="sm" onClick={() => { setZoek(''); setFCategorie('all'); setFType('all'); setFRsvp('all') }}>
                    Wis filters
                  </Button>
                }
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
                    {zichtbaar.map((g) => (
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
                          <select
                            value={g.rsvpStatus}
                            onChange={async (e) => {
                              try {
                                await updateGuest(g.id, { rsvpStatus: e.target.value as Guest['rsvpStatus'] })
                              } catch {
                                toast({ title: 'Bijwerken mislukt', variant: 'error' })
                              }
                            }}
                            className="rounded-md border border-transparent bg-transparent text-sm text-foreground hover:border-border focus:border-border focus:outline-none focus:ring-1 focus:ring-primary px-1 py-0.5 cursor-pointer"
                          >
                            {RSVP_STATUSSEN.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {g.heeftPartner ? g.partnerNaam || 'ja' : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{g.aantalKinderen || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {g.rsvpCode ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Kopieer RSVP-link"
                                  disabled={!origin}
                                  onClick={() => kopieer(`${origin}/rsvp/${g.rsvpCode}`, `copy-${g.id}`)}
                                >
                                  {gekopieerd === `copy-${g.id}` ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Stuur RSVP-link"
                                  onClick={() => { setRsvpTarget(g); setRsvpEmail('') }}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </>
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
                {zichtbaar.map((g) => (
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
                      <select
                        value={g.rsvpStatus}
                        onChange={async (e) => {
                          try {
                            await updateGuest(g.id, { rsvpStatus: e.target.value as Guest['rsvpStatus'] })
                          } catch {
                            toast({ title: 'Bijwerken mislukt', variant: 'error' })
                          }
                        }}
                        className="rounded-md border border-transparent bg-transparent text-sm text-foreground hover:border-border focus:border-border focus:outline-none focus:ring-1 focus:ring-primary px-1 py-0.5 cursor-pointer"
                      >
                        {RSVP_STATUSSEN.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
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
                        <>
                          <Button variant="ghost" size="sm" disabled={!origin} onClick={() => kopieer(`${origin}/rsvp/${g.rsvpCode}`, `copy-${g.id}`)}>
                            {gekopieerd === `copy-${g.id}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {gekopieerd === `copy-${g.id}` ? 'Gekopieerd' : 'Kopieer'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setRsvpTarget(g); setRsvpEmail('') }}>
                            <Mail className="h-4 w-4" />
                          </Button>
                        </>
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
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {gefilterd.length === guests.length
                ? `${guests.length} gasten weergegeven`
                : `${gefilterd.length} van ${guests.length} gasten weergegeven`}
            </span>
            {(() => {
              const totKinderen = gefilterd.reduce((s, g) => s + (g.aantalKinderen || 0), 0)
              return totKinderen > 0 ? <span>{totKinderen} kinderen</span> : null
            })()}
          </div>
          </div>
        </>
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
          } catch (e) {
            toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
            throw e
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
          const verwijderd = delGuest
          try {
            await deleteGuest(verwijderd.id)
            toast({
              title: 'Gast verwijderd',
              description: `${verwijderd.voornaam} ${verwijderd.achternaam}`.trim(),
              variant: 'success',
              duration: 7000,
              action: {
                label: 'Ongedaan maken',
                onClick: () => {
                  void addGuest({
                    voornaam: verwijderd.voornaam,
                    achternaam: verwijderd.achternaam,
                    categorie: verwijderd.categorie,
                    gasttype: verwijderd.gasttype,
                    rsvpStatus: verwijderd.rsvpStatus,
                    dieetwensen: verwijderd.dieetwensen,
                    heeftPartner: verwijderd.heeftPartner,
                    partnerNaam: verwijderd.partnerNaam,
                    aantalKinderen: verwijderd.aantalKinderen,
                    adres: verwijderd.adres,
                    notitie: verwijderd.notitie,
                  })
                },
              },
            })
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
              autoFocus
              autoComplete="email"
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
