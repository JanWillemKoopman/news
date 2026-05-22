'use client'

import * as React from 'react'
import { Download, Pencil, Plus, Search, Trash2, Users } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { GuestForm } from '@/components/bruiloft/gasten/GuestForm'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
  StatusBadge,
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

  const [zoek, setZoek] = React.useState('')
  const [fCategorie, setFCategorie] = React.useState('all')
  const [fType, setFType] = React.useState('all')
  const [fRsvp, setFRsvp] = React.useState('all')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editGuest, setEditGuest] = React.useState<Guest | null>(null)
  const [delGuest, setDelGuest] = React.useState<Guest | null>(null)

  if (!wedding) return null

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
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titel="Gasten"
        beschrijving="Beheer de gastenlijst en houd de reacties bij."
        actie={
          <>
            <Button variant="outline" onClick={exporteer} disabled={guests.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Gast
            </Button>
          </>
        }
      />

      {/* Tellingen */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Telling label="Totaal" waarde={t.totaal} />
        <Telling label="Bevestigd" waarde={t.bevestigd} toon="green" />
        <Telling label="Afgemeld" waarde={t.afgemeld} toon="red" />
        <Telling label="Geen reactie" waarde={t.geenReactie} toon="amber" />
        <Telling label="Daggasten" waarde={t.daggasten} />
        <Telling label="Avondgasten" waarde={t.avondgasten} />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="all">Alle types</option>
            {GASTTYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select value={fRsvp} onChange={(e) => setFRsvp(e.target.value)}>
            <option value="all">Alle RSVP-statussen</option>
            {RSVP_STATUSSEN.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

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
      ) : gefilterd.length === 0 ? (
        <EmptyState icon={Search} titel="Geen gasten gevonden" beschrijving="Pas je filters of zoekopdracht aan." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Naam</th>
                  <th className="px-4 py-3 font-medium">Categorie</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">RSVP</th>
                  <th className="px-4 py-3 font-medium">Partner</th>
                  <th className="px-4 py-3 font-medium">Kinderen</th>
                  <th className="px-4 py-3" />
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
        </Card>
      )}

      <GuestForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editGuest}
        onSubmit={(data) => {
          if (editGuest) void updateGuest(editGuest.id, data)
          else void addGuest(data)
        }}
      />

      <ConfirmDialog
        open={delGuest !== null}
        onOpenChange={(o) => !o && setDelGuest(null)}
        title="Gast verwijderen?"
        description={
          delGuest ? `Weet je zeker dat je ${delGuest.voornaam} ${delGuest.achternaam} wilt verwijderen?` : undefined
        }
        onConfirm={() => delGuest && void deleteGuest(delGuest.id)}
      />
    </div>
  )
}

function Telling({
  label,
  waarde,
  toon,
}: {
  label: string
  waarde: number
  toon?: 'green' | 'red' | 'amber'
}) {
  const kleur =
    toon === 'green'
      ? 'text-emerald-600 dark:text-emerald-400'
      : toon === 'red'
        ? 'text-rose-600 dark:text-rose-400'
        : toon === 'amber'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-foreground'
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${kleur}`}>{waarde}</p>
      </CardContent>
    </Card>
  )
}
