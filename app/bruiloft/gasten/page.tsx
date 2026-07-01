'use client'

import * as React from 'react'
import { ChevronsUpDown, Download, Link2, Pencil, Plus, Search, Send, Sparkles, Trash2, Users } from 'lucide-react'

import { GuestForm } from '@/components/bruiloft/gasten/GuestForm'
import { BulkImportDialog } from '@/components/bruiloft/gasten/BulkImportDialog'
import { GastenFilters } from '@/components/bruiloft/gasten/GastenFilters'
import { GastenStatsStrip } from '@/components/bruiloft/gasten/GastenStatsStrip'
import { RsvpDeelModal } from '@/components/bruiloft/gasten/RsvpDeelModal'
import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { gastenInfo } from '@/components/bruiloft/faqContent'
import { AIInsightCard } from '@/components/bruiloft/ai/AIInsightCard'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  OverflowMenu,
  StatusBadge,
  useToast,
} from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import { categorieLabelVoor, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useScrollRestore } from '@/lib/bruiloft/useScrollRestore'
import { capFirst } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Guest, RsvpStatus } from '@/lib/bruiloft/types'

// Inline RSVP-select: ziet eruit als een badge maar is klikbaar om de status te wijzigen.
// Gebruik een custom dropdown i.p.v. native <select> zodat iOS Safari de tekst niet
// forceert naar 16px (het minimum voor form-elementen).
function RsvpSelect({
  value,
  onChange,
}: {
  value: RsvpStatus
  onChange: (v: RsvpStatus) => Promise<void> | void
}) {
  const [pending, setPending] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSelect = async (v: RsvpStatus) => {
    setOpen(false)
    setPending(true)
    try {
      await onChange(v)
    } finally {
      setPending(false)
    }
  }

  // Eén betekenisvolle kleur: rose alleen voor "afgemeld", verder neutraal —
  // zelfde regel als StatusBadge, hier lokaal omdat dit element klikbaar is.
  const klassen: Record<RsvpStatus, string> = {
    'niet verzonden': 'bg-foreground/[0.06] text-muted-foreground ring-foreground/10',
    bevestigd: 'bg-foreground/[0.06] text-muted-foreground ring-foreground/10',
    afgemeld: 'bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:text-rose-300 dark:ring-rose-400/20',
    uitgenodigd: 'bg-foreground/[0.06] text-muted-foreground ring-foreground/10',
    'geen reactie': 'bg-foreground/[0.06] text-muted-foreground ring-foreground/10',
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        disabled={pending}
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p) }}
        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-opacity focus:outline-none ${pending ? 'cursor-wait opacity-50' : 'cursor-pointer'} ${klassen[value]}`}
      >
        {capFirst(value)}
        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-border bg-background p-1 shadow-lg"
        >
          {RSVP_STATUSSEN.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={s === value}
              onClick={(e) => { e.stopPropagation(); void handleSelect(s) }}
              className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent ${s === value ? 'font-semibold' : ''}`}
            >
              {capFirst(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GastenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const tables = useBruiloftStore((s) => s.tables)
  const addGuest = useBruiloftStore((s) => s.addGuest)
  const updateGuest = useBruiloftStore((s) => s.updateGuest)
  const deleteGuest = useBruiloftStore((s) => s.deleteGuest)
  const ensureRsvpCodes = useBruiloftStore((s) => s.ensureRsvpCodes)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'gasten')
  const { save: saveScroll, restore: restoreScroll } = useScrollRestore()
  const savedScroll = React.useRef(0)

  const [zoek, setZoek] = React.useState('')
  const [fCategorie, setFCategorie] = React.useState('all')
  const [fType, setFType] = React.useState('all')
  const [fRsvp, setFRsvp] = React.useState('all')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editGuest, setEditGuest] = React.useState<Guest | null>(null)
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [delGuest, setDelGuest] = React.useState<Guest | null>(null)

  const [rsvpTarget, setRsvpTarget] = React.useState<Guest | null>(null)

  const tafelNamen = React.useMemo(
    () => new Map(tables.map((t) => [t.id, t.naam])),
    [tables]
  )

  // Zorg dat alle gasten een RSVP-code hebben zodra de pagina geladen is.
  React.useEffect(() => {
    if (wedding) void ensureRsvpCodes()
    // ensureRsvpCodes is een stabiele store-referentie
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wedding?.id])

  if (!wedding) return null

  const genereerLinks = async () => {
    try {
      await ensureRsvpCodes()
      toast({ title: 'RSVP-links gereed', description: 'Alle gasten hebben nu een persoonlijke RSVP-link.', variant: 'success' })
    } catch {
      toast({ title: 'Genereren mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  const updateRsvp = async (g: Guest, status: RsvpStatus) => {
    try {
      await updateGuest(g.id, { rsvpStatus: status })
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

  const zichtbaar = [...gefilterd].sort((a, b) =>
    (a.achternaam || '').localeCompare(b.achternaam || '', 'nl') ||
    a.voornaam.localeCompare(b.voornaam, 'nl')
  )

  const openNieuw = () => {
    savedScroll.current = saveScroll()
    setEditGuest(null)
    setFormOpen(true)
  }
  const openBewerk = (g: Guest) => {
    savedScroll.current = saveScroll()
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
          'E-mail',
          'Telefoon',
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
          g.email,
          g.telefoon,
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
        info={<PageInfoButton {...gastenInfo} />}
        primaryActie={
          kanBewerken ? (
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Gast toevoegen
            </Button>
          ) : null
        }
        meerActies={[
          ...(kanBewerken
            ? [{ label: 'Bulk import', icon: Sparkles, onClick: () => setBulkOpen(true) }]
            : []),
          ...(kanBewerken
            ? [{
                label: 'Genereer RSVP-links',
                icon: Link2,
                onClick: genereerLinks,
                disabled: guests.length === 0,
              }]
            : []),
          {
            label: 'Exporteer gastenlijst',
            icon: Download,
            onClick: exporteer,
            disabled: guests.length === 0,
          },
        ]}
        fab={kanBewerken ? { label: 'Gast toevoegen', onClick: openNieuw } : undefined}
      />

      <AIInsightCard sectie="/bruiloft/gasten" />

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
          <div className="sticky top-0 z-20 -mx-4 bg-muted px-4 pt-1 pb-2 md:-mx-8 md:px-8">
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
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm">

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
                      <th scope="col" className="px-4 py-3 font-medium">Tafel</th>
                      <th scope="col" className="px-4 py-3 font-medium">RSVP</th>
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
                        <td className="px-4 py-3 text-muted-foreground">{capFirst(g.gasttype)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tafelNamen.get(g.tafelId ?? '') ?? '—'}
                        </td>
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
                                    label: 'Uitnodiging versturen',
                                    icon: Send,
                                    onClick: () => setRsvpTarget(g),
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
                  <div
                    key={g.id}
                    role={kanBewerken ? 'button' : undefined}
                    tabIndex={kanBewerken ? 0 : undefined}
                    aria-label={kanBewerken ? `${g.voornaam} ${g.achternaam} bewerken` : undefined}
                    onClick={kanBewerken ? () => openBewerk(g) : undefined}
                    onKeyDown={kanBewerken ? (e) => { if (e.key === 'Enter' || e.key === ' ') openBewerk(g) } : undefined}
                    className={`flex min-h-[3.5rem] items-center gap-3 px-4 py-3 transition-colors${kanBewerken ? ' cursor-pointer hover:bg-accent/40 active:bg-accent/60' : ''}`}
                  >
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

                    {/* RSVP-select */}
                    <RsvpSelect
                      value={g.rsvpStatus}
                      onChange={(v) => updateRsvp(g, v)}
                    />

                    {/* Actiemenu */}
                    {(g.rsvpCode || kanBewerken) ? (
                      <OverflowMenu
                        label="Acties voor deze gast"
                        align="right"
                        items={[
                          ...(g.rsvpCode ? [
                            {
                              label: 'Uitnodiging versturen',
                              icon: Send,
                              onClick: () => setRsvpTarget(g),
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
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) restoreScroll(savedScroll.current)
        }}
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

      <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} />

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
                    email: verwijderd.email,
                    telefoon: verwijderd.telefoon,
                  })
                },
              },
            })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />

      <RsvpDeelModal
        guest={rsvpTarget}
        onOpenChange={(o) => { if (!o) setRsvpTarget(null) }}
        weddingId={wedding.id}
      />
    </div>
  )
}
