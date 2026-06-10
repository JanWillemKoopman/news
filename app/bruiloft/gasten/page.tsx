'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Download, Link2, Mail, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'

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
  StatusBadge,
  useToast,
} from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import { categorieLabelVoor, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Guest, RsvpStatus } from '@/lib/bruiloft/types'

// Inline RSVP-select: ziet eruit als een badge maar is klikbaar om de status te wijzigen.
function RsvpSelect({
  value,
  onChange,
}: {
  value: RsvpStatus
  onChange: (v: RsvpStatus) => void
}) {
  const klassen: Record<RsvpStatus, string> = {
    bevestigd: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    afgemeld: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800',
    uitgenodigd: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800',
    'geen reactie': 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  }
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as RsvpStatus)}
      className={`rounded-full border px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer ${klassen[value]}`}
    >
      {RSVP_STATUSSEN.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}

// Klikbare kolomkop met sorteerindicator voor de gastentabel.
function SorteerKop<K extends string>({
  label,
  kolom,
  actief,
  richting,
  onSorteer,
}: {
  label: string
  kolom: K
  actief: K
  richting: 'asc' | 'desc'
  onSorteer: (kolom: K) => void
}) {
  const isActief = actief === kolom
  return (
    <th scope="col" className="px-4 py-3 font-medium" aria-sort={isActief ? (richting === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        onClick={() => onSorteer(kolom)}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {label}
        {isActief ? (
          richting === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  )
}

export default function GastenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const addGuest = useBruiloftStore((s) => s.addGuest)
  const updateGuest = useBruiloftStore((s) => s.updateGuest)
  const deleteGuest = useBruiloftStore((s) => s.deleteGuest)
  const ensureRsvpCodes = useBruiloftStore((s) => s.ensureRsvpCodes)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'gasten')

  const [zoek, setZoek] = React.useState('')
  const [fCategorie, setFCategorie] = React.useState('all')
  const [fType, setFType] = React.useState('all')
  const [fRsvp, setFRsvp] = React.useState('all')
  const [sortKolom, setSortKolom] = React.useState<'naam' | 'categorie' | 'type' | 'rsvp'>('naam')
  const [sortRichting, setSortRichting] = React.useState<'asc' | 'desc'>('asc')

  const wisselSortering = (kolom: typeof sortKolom) => {
    if (kolom === sortKolom) {
      setSortRichting((r) => (r === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKolom(kolom)
      setSortRichting('asc')
    }
  }

  const [formOpen, setFormOpen] = React.useState(false)
  const [editGuest, setEditGuest] = React.useState<Guest | null>(null)
  const [delGuest, setDelGuest] = React.useState<Guest | null>(null)

  const [rsvpTarget, setRsvpTarget] = React.useState<Guest | null>(null)
  const [rsvpEmail, setRsvpEmail] = React.useState('')
  const [rsvpSending, setRsvpSending] = React.useState(false)
  const [gekopieerd, setGekopieerd] = React.useState<string | null>(null)
  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => { setOrigin(window.location.origin) }, [])

  // Zorg dat alle gasten een RSVP-code hebben zodra de pagina geladen is.
  React.useEffect(() => {
    if (wedding) void ensureRsvpCodes()
    // ensureRsvpCodes is een stabiele store-referentie
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wedding?.id])

  if (!wedding) return null

  const kopieer = async (tekst: string, id: string) => {
    try {
      await navigator.clipboard.writeText(tekst)
      setGekopieerd(id)
      toast({ title: 'Link gekopieerd', description: 'De RSVP-link staat nu in je klembord.', variant: 'success' })
      setTimeout(() => setGekopieerd(null), 1500)
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Geef toegang tot het klembord en probeer opnieuw.', variant: 'error' })
    }
  }

  const genereerLinks = async () => {
    try {
      await ensureRsvpCodes()
      toast({ title: 'RSVP-links gereed', description: 'Alle gasten hebben nu een persoonlijke RSVP-link.', variant: 'success' })
    } catch {
      toast({ title: 'Genereren mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
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

  const updateRsvp = async (g: Guest, status: RsvpStatus) => {
    const vorige = g.rsvpStatus
    if (vorige === status) return
    try {
      await updateGuest(g.id, { rsvpStatus: status })
      // De inline select in de tabel is snel (per ongeluk) gewijzigd; een
      // undo-toast maakt dat zonder zoeken terug te draaien.
      toast({
        title: 'RSVP bijgewerkt',
        description: `${g.voornaam} ${g.achternaam}`.trim() + ` → ${status}`,
        variant: 'success',
        action: {
          label: 'Ongedaan maken',
          onClick: () => {
            void updateGuest(g.id, { rsvpStatus: vorige })
          },
        },
      })
    } catch {
      toast({ title: 'Bijwerken mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
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

  const opNaam = (a: Guest, b: Guest) =>
    (a.achternaam || '').localeCompare(b.achternaam || '', 'nl') ||
    a.voornaam.localeCompare(b.voornaam, 'nl')

  const zichtbaar = [...gefilterd].sort((a, b) => {
    let verschil = 0
    if (sortKolom === 'categorie') verschil = a.categorie.localeCompare(b.categorie, 'nl')
    else if (sortKolom === 'type') verschil = a.gasttype.localeCompare(b.gasttype, 'nl')
    else if (sortKolom === 'rsvp') verschil = a.rsvpStatus.localeCompare(b.rsvpStatus, 'nl')
    if (verschil === 0) verschil = opNaam(a, b)
    return sortRichting === 'asc' ? verschil : -verschil
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
    try {
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
    } catch {
      toast({ title: 'Export mislukt', variant: 'error' })
    }
  }

  const p1 = wedding.partner1Naam
  const p2 = wedding.partner2Naam

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Gastenlijst"
        beschrijving="Beheer de gastenlijst en houd de reacties bij."
        actie={
          <>
            {kanBewerken && (
              <Button onClick={openNieuw}>
                <Plus className="h-4 w-4" /> Gast toevoegen
              </Button>
            )}
            <OverflowMenu
              items={[
                ...(kanBewerken ? [{
                  label: 'Genereer RSVP-links',
                  icon: Link2,
                  onClick: genereerLinks,
                  disabled: guests.length === 0,
                }] : []),
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
        fab={kanBewerken ? { label: 'Gast toevoegen', onClick: openNieuw } : undefined}
      />

      {/* StatsStrip pas tonen bij genoeg gasten zodat de statistieken betekenisvol zijn. */}
      {guests.length >= 5 ? <GastenStatsStrip guests={guests} /> : null}

      {/* ── Gastenlijst container ── */}
      {guests.length === 0 ? (
        <EmptyState
          icon={Users}
          titel="Nog geen gasten"
          beschrijving={kanBewerken ? 'Voeg je eerste gast toe om de gastenlijst op te bouwen.' : 'Er zijn nog geen gasten.'}
          actie={
            kanBewerken ? (
              <Button onClick={openNieuw}>
                <Plus className="h-4 w-4" /> Gast toevoegen
              </Button>
            ) : undefined
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
            wedding={wedding}
          />
          <div className="rounded-lg border border-border bg-card shadow-sm">

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
                      <SorteerKop label="Naam" kolom="naam" actief={sortKolom} richting={sortRichting} onSorteer={wisselSortering} />
                      <SorteerKop label="Categorie" kolom="categorie" actief={sortKolom} richting={sortRichting} onSorteer={wisselSortering} />
                      <SorteerKop label="Type" kolom="type" actief={sortKolom} richting={sortRichting} onSorteer={wisselSortering} />
                      <SorteerKop label="RSVP" kolom="rsvp" actief={sortKolom} richting={sortRichting} onSorteer={wisselSortering} />
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
                          {(g.heeftPartner || g.aantalKinderen > 0 || g.dieetwensen) ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {[
                                g.heeftPartner ? `+ partner${g.partnerNaam ? ` (${g.partnerNaam})` : ''}` : null,
                                g.aantalKinderen > 0 ? `${g.aantalKinderen} kind(eren)` : null,
                                g.dieetwensen || null,
                              ].filter(Boolean).join(' · ')}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {categorieLabelVoor(g.categorie, p1, p2)}
                        </td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{g.gasttype}</td>
                        <td className="px-4 py-3">
                          {kanBewerken ? (
                            <RsvpSelect
                              value={g.rsvpStatus}
                              onChange={(v) => updateRsvp(g, v)}
                            />
                          ) : (
                            <StatusBadge kind="rsvp" value={g.rsvpStatus} />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <OverflowMenu
                              label="Acties voor deze gast"
                              items={[
                                ...(g.rsvpCode ? [
                                  {
                                    label: 'Kopieer RSVP-link',
                                    icon: Copy,
                                    disabled: !origin,
                                    onClick: () => kopieer(`${origin}/rsvp/${g.rsvpCode}`, `copy-${g.id}`),
                                  },
                                  {
                                    label: 'Stuur RSVP-link per e-mail',
                                    icon: Mail,
                                    onClick: () => { setRsvpTarget(g); setRsvpEmail('') },
                                  },
                                ] : []),
                                ...(kanBewerken ? [
                                  {
                                    label: 'Bewerken',
                                    icon: Pencil,
                                    onClick: () => openBewerk(g),
                                  },
                                  {
                                    label: 'Verwijderen',
                                    icon: Trash2,
                                    danger: true,
                                    onClick: () => setDelGuest(g),
                                  },
                                ] : []),
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobiel: compacte lijstweergave */}
              <div className="divide-y divide-border md:hidden">
                {zichtbaar.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Naam + details */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground text-sm">
                        {g.voornaam} {g.achternaam}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {categorieLabelVoor(g.categorie, p1, p2)} · {g.gasttype}
                        {(g.heeftPartner || g.aantalKinderen > 0 || g.dieetwensen) ? (
                          <> · {[
                            g.heeftPartner ? `+ partner${g.partnerNaam ? ` (${g.partnerNaam})` : ''}` : null,
                            g.aantalKinderen > 0 ? `${g.aantalKinderen} kind(eren)` : null,
                            g.dieetwensen || null,
                          ].filter(Boolean).join(' · ')}</>
                        ) : null}
                      </p>
                    </div>

                    {/* RSVP-select (alleen-lezen badge voor wie niet mag bewerken) */}
                    {kanBewerken ? (
                      <RsvpSelect
                        value={g.rsvpStatus}
                        onChange={(v) => updateRsvp(g, v)}
                      />
                    ) : (
                      <StatusBadge kind="rsvp" value={g.rsvpStatus} />
                    )}

                    {/* Actiemenu */}
                    {(g.rsvpCode || kanBewerken) ? (
                      <OverflowMenu
                        label="Acties voor deze gast"
                        align="right"
                        items={[
                          ...(g.rsvpCode ? [
                            {
                              label: 'Kopieer RSVP-link',
                              icon: Copy,
                              disabled: !origin,
                              onClick: () => kopieer(`${origin}/rsvp/${g.rsvpCode}`, `copy-${g.id}`),
                            },
                            {
                              label: 'Stuur RSVP-link per e-mail',
                              icon: Mail,
                              onClick: () => { setRsvpTarget(g); setRsvpEmail('') },
                            },
                          ] : []),
                          ...(kanBewerken ? [
                            {
                              label: 'Bewerken',
                              icon: Pencil,
                              onClick: () => openBewerk(g),
                            },
                            {
                              label: 'Verwijderen',
                              icon: Trash2,
                              danger: true,
                              onClick: () => setDelGuest(g),
                            },
                          ] : []),
                        ]}
                      />
                    ) : null}
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
        wedding={wedding}
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
