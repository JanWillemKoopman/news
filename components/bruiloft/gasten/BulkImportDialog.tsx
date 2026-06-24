'use client'

import * as React from 'react'
import { AlertTriangle, ChevronDown, FileText, ListChecks, Trash2, Upload, Users, X } from 'lucide-react'

import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/components/bruiloft/ui'
import { categorieLabelVoor, GASTTYPES, GUEST_CATEGORIEEN, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import { capFirst, cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { GuestInput } from '@/lib/bruiloft/types'

type NewGuest = Omit<GuestInput, 'weddingId'>

// Eén rij in de controlelijst: een NewGuest plus UI-state (selectie, mogelijke dubbel).
interface Rij extends NewGuest {
  _id: string
  _include: boolean
  _dup: boolean
  _open: boolean
}

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.csv,.txt,image/*,application/pdf'

function naamSleutel(voornaam: string, achternaam: string): string {
  return `${voornaam} ${achternaam}`.trim().toLowerCase().replace(/\s+/g, ' ')
}

const LAAD_BERICHTEN = [
  'Bestand lezen...',
  'Namen herkennen...',
  'Categorieën bepalen...',
  'Gegevens ordenen...',
  'Bijna klaar...',
]

function LaadScherm({ bronNaam }: { bronNaam: string }) {
  const [voortgang, setVoortgang] = React.useState(0)
  const [berichtIndex, setBerichtIndex] = React.useState(0)

  React.useEffect(() => {
    // Voortgangsbalk: snel naar 80%, dan langzaam door naar 92%
    const stappen = [
      { doel: 30, ms: 400 },
      { doel: 58, ms: 800 },
      { doel: 75, ms: 1200 },
      { doel: 83, ms: 2000 },
      { doel: 90, ms: 3000 },
      { doel: 92, ms: 5000 },
    ]
    const timers: ReturnType<typeof setTimeout>[] = []
    let verstreken = 0
    for (const { doel, ms } of stappen) {
      verstreken += ms
      timers.push(setTimeout(() => setVoortgang(doel), verstreken))
    }
    return () => timers.forEach(clearTimeout)
  }, [])

  React.useEffect(() => {
    const interval = setInterval(() => {
      setBerichtIndex((i) => (i + 1) % LAAD_BERICHTEN.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 text-center">
      {/* Animerend icoon */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-2 rounded-full bg-primary/15" />
        <Users className="relative h-9 w-9 text-primary" />
      </div>

      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">Gastenlijst verwerken</p>
        <p className="text-sm text-muted-foreground truncate max-w-xs">{bronNaam}</p>
      </div>

      {/* Voortgangsbalk */}
      <div className="w-full space-y-2">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${voortgang}%`, transitionDuration: '800ms', transitionTimingFunction: 'ease-out' }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="transition-opacity duration-500">{LAAD_BERICHTEN[berichtIndex]}</span>
          <span>{voortgang}%</span>
        </div>
      </div>

      {/* Stappen */}
      <div className="w-full space-y-2 text-left">
        {LAAD_BERICHTEN.slice(0, -1).map((bericht, i) => (
          <div key={bericht} className={cn('flex items-center gap-2 text-sm transition-colors duration-300',
            i < berichtIndex ? 'text-primary' : i === berichtIndex ? 'text-foreground font-medium' : 'text-muted-foreground/50'
          )}>
            <div className={cn('h-1.5 w-1.5 rounded-full transition-colors duration-300 shrink-0',
              i < berichtIndex ? 'bg-primary' : i === berichtIndex ? 'bg-foreground' : 'bg-muted-foreground/30'
            )} />
            {bericht}
          </div>
        ))}
      </div>
    </div>
  )
}

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const addGuests = useBruiloftStore((s) => s.addGuests)
  const { toast } = useToast()

  const [stap, setStap] = React.useState<'invoer' | 'laden' | 'controle'>('invoer')
  const [bron, setBron] = React.useState<'bestand' | 'tekst'>('bestand')
  const [file, setFile] = React.useState<File | null>(null)
  const [tekst, setTekst] = React.useState('')
  const [bezig, setBezig] = React.useState(false)
  const [importeren, setImporteren] = React.useState(false)
  const [samenvatting, setSamenvatting] = React.useState('')
  const [rijen, setRijen] = React.useState<Rij[]>([])
  const fileRef = React.useRef<HTMLInputElement>(null)

  // Reset alles wanneer de dialoog opent.
  React.useEffect(() => {
    if (open) {
      setStap('invoer')
      setBron('bestand')
      setFile(null)
      setTekst('')
      setBezig(false)
      setImporteren(false)
      setSamenvatting('')
      setRijen([])
    }
  }, [open])

  const bestaandeNamen = React.useMemo(
    () => new Set(guests.map((g) => naamSleutel(g.voornaam, g.achternaam))),
    [guests]
  )

  const p1 = wedding?.partner1Naam
  const p2 = wedding?.partner2Naam

  const kanAnalyseren = bron === 'bestand' ? !!file : tekst.trim().length > 0

  async function analyseer() {
    if (!wedding || bezig) return
    if (!kanAnalyseren) return
    setBezig(true)
    setStap('laden')
    try {
      const fd = new FormData()
      fd.append('weddingId', wedding.id)
      fd.append('partner1', wedding.partner1Naam || '')
      fd.append('partner2', wedding.partner2Naam || '')
      if (bron === 'bestand' && file) fd.append('file', file)
      if (bron === 'tekst') fd.append('text', tekst)

      const res = await fetch('/api/ai/gasten-import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Verwerken mislukt', description: data?.error || 'Probeer het opnieuw.', variant: 'error' })
        setStap('invoer')
        return
      }
      const ruw: NewGuest[] = Array.isArray(data.gasten) ? data.gasten : []
      if (ruw.length === 0) {
        toast({ title: 'Geen gasten gevonden', description: 'Controleer het bestand of de tekst en probeer opnieuw.', variant: 'error' })
        setStap('invoer')
        return
      }
      const nieuwe: Rij[] = ruw.map((g, i) => {
        const dup = bestaandeNamen.has(naamSleutel(g.voornaam, g.achternaam))
        return { ...g, _id: `${Date.now()}-${i}`, _include: !dup, _dup: dup, _open: false }
      })
      setRijen(nieuwe)
      setSamenvatting(typeof data.samenvatting === 'string' ? data.samenvatting : '')
      setStap('controle')
    } catch {
      toast({ title: 'Verwerken mislukt', description: 'Er ging iets mis. Probeer het opnieuw.', variant: 'error' })
      setStap('invoer')
    } finally {
      setBezig(false)
    }
  }

  function patch(id: string, veld: Partial<Rij>) {
    setRijen((rs) => rs.map((r) => (r._id === id ? { ...r, ...veld } : r)))
  }
  function verwijder(id: string) {
    setRijen((rs) => rs.filter((r) => r._id !== id))
  }

  const geselecteerd = rijen.filter((r) => r._include)
  const aantalDup = rijen.filter((r) => r._dup).length

  async function importeer() {
    if (importeren) return
    const teImporteren = geselecteerd
      .filter((r) => r.voornaam.trim() || r.achternaam.trim())
      .map<NewGuest>((r) => ({
        voornaam: r.voornaam.trim(),
        achternaam: r.achternaam.trim(),
        categorie: r.categorie,
        gasttype: r.gasttype,
        rsvpStatus: r.rsvpStatus,
        dieetwensen: r.dieetwensen.trim(),
        heeftPartner: r.heeftPartner,
        partnerNaam: r.heeftPartner ? r.partnerNaam.trim() : '',
        aantalKinderen: Math.max(0, Math.round(Number(r.aantalKinderen) || 0)),
        adres: r.adres.trim(),
        notitie: r.notitie.trim(),
      }))
    if (teImporteren.length === 0) {
      toast({ title: 'Niets geselecteerd', description: 'Vink minstens één gast aan om te importeren.', variant: 'error' })
      return
    }
    setImporteren(true)
    try {
      const aantal = await addGuests(teImporteren)
      toast({
        title: `${aantal} ${aantal === 1 ? 'gast' : 'gasten'} geïmporteerd`,
        variant: 'success',
      })
      onOpenChange(false)
    } catch {
      toast({ title: 'Importeren mislukt', description: 'Er ging iets mis bij het opslaan.', variant: 'error' })
    } finally {
      setImporteren(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Gasten importeren"
      description={stap === 'invoer'
        ? 'Upload een bestand of plak een lijst. We zetten het automatisch om naar een gastenlijst die je hierna controleert.'
        : undefined}
      className="sm:max-w-3xl"
    >
      {stap === 'laden' ? (
        <LaadScherm bronNaam={bron === 'bestand' ? (file?.name ?? 'bestand') : 'tekst'} />
      ) : stap === 'invoer' ? (
        <div className="space-y-4">
          {/* Bron-tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setBron('bestand')}
              className={cn('flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                bron === 'bestand' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <Upload className="h-4 w-4" /> Upload bestand
            </button>
            <button
              type="button"
              onClick={() => setBron('tekst')}
              className={cn('flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                bron === 'tekst' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <FileText className="h-4 w-4" /> Plak tekst
            </button>
          </div>

          {bron === 'bestand' ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Bestand verwijderen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:border-primary hover:bg-accent/40"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Kies een bestand</span>
                  <span className="text-xs text-muted-foreground">PDF, Excel, Word, CSV, afbeelding of tekst</span>
                </button>
              )}
            </div>
          ) : (
            <Field label="Plak je gastenlijst" htmlFor="bulk-tekst">
              <Textarea
                id="bulk-tekst"
                value={tekst}
                onChange={(e) => setTekst(e.target.value)}
                rows={8}
                placeholder={'Bijv.:\nJan de Vries +1 (vegetarisch)\nFamilie Bakker, 2 kinderen\nSophie Janssen - avondgast'}
              />
            </Field>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="button" onClick={analyseer} disabled={!kanAnalyseren}>
              <ListChecks className="h-4 w-4" /> Verwerken
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {samenvatting ? (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-accent/30 p-3 text-sm">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{samenvatting}</span>
            </div>
          ) : null}

          {aantalDup > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{aantalDup} mogelijke {aantalDup === 1 ? 'dubbel' : 'dubbelen'} gevonden (zelfde naam staat al in de lijst). Deze zijn standaard uitgevinkt.</span>
            </div>
          ) : null}

          <p className="text-sm text-muted-foreground">
            {geselecteerd.length} van {rijen.length} geselecteerd. Controleer en pas aan waar nodig.
          </p>

          {/* Controlelijst — kaart per gast, bewerkbaar */}
          <div className="-mx-1 max-h-[55vh] space-y-2 overflow-y-auto px-1">
            {rijen.map((r) => (
              <div
                key={r._id}
                className={cn('rounded-lg border p-3 transition-colors',
                  r._include ? 'border-border bg-background' : 'border-border/60 bg-muted/40 opacity-70')}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={r._include}
                    onChange={(e) => patch(r._id, { _include: e.target.checked })}
                    className="mt-2.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                    aria-label="Gast meenemen in import"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={r.voornaam}
                        onChange={(e) => patch(r._id, { voornaam: e.target.value })}
                        placeholder="Voornaam"
                        aria-label="Voornaam"
                      />
                      <Input
                        value={r.achternaam}
                        onChange={(e) => patch(r._id, { achternaam: e.target.value })}
                        placeholder="Achternaam"
                        aria-label="Achternaam"
                      />
                    </div>
                    {r._dup ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" /> Mogelijk dubbel
                      </span>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Select
                        value={r.categorie}
                        onChange={(e) => patch(r._id, { categorie: e.target.value as NewGuest['categorie'] })}
                        aria-label="Categorie"
                      >
                        {GUEST_CATEGORIEEN.map((c) => (
                          <option key={c} value={c}>{categorieLabelVoor(c, p1, p2)}</option>
                        ))}
                      </Select>
                      <Select
                        value={r.gasttype}
                        onChange={(e) => patch(r._id, { gasttype: e.target.value as NewGuest['gasttype'] })}
                        aria-label="Gasttype"
                      >
                        {GASTTYPES.map((t) => (
                          <option key={t} value={t}>{capFirst(t)}</option>
                        ))}
                      </Select>
                      <Select
                        value={r.rsvpStatus}
                        onChange={(e) => patch(r._id, { rsvpStatus: e.target.value as NewGuest['rsvpStatus'] })}
                        aria-label="RSVP-status"
                      >
                        {RSVP_STATUSSEN.map((s) => (
                          <option key={s} value={s}>{capFirst(s)}</option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        value={r.aantalKinderen || ''}
                        onChange={(e) => patch(r._id, { aantalKinderen: Number(e.target.value) || 0 })}
                        placeholder="Kinderen"
                        aria-label="Aantal kinderen"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={r.heeftPartner}
                          onChange={(e) => patch(r._id, { heeftPartner: e.target.checked })}
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                        Partner
                      </label>
                      {r.heeftPartner ? (
                        <Input
                          className="h-9 flex-1 min-w-[8rem]"
                          value={r.partnerNaam}
                          onChange={(e) => patch(r._id, { partnerNaam: e.target.value })}
                          placeholder="Naam partner (optioneel)"
                          aria-label="Naam partner"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => patch(r._id, { _open: !r._open })}
                        className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', r._open && 'rotate-180')} />
                        Meer
                      </button>
                    </div>

                    {r._open ? (
                      <div className="space-y-2 border-t border-border pt-2">
                        <Input
                          value={r.dieetwensen}
                          onChange={(e) => patch(r._id, { dieetwensen: e.target.value })}
                          placeholder="Dieetwensen"
                          aria-label="Dieetwensen"
                        />
                        <Textarea
                          value={r.adres}
                          onChange={(e) => patch(r._id, { adres: e.target.value })}
                          placeholder="Adres (voor de uitnodiging)"
                          rows={2}
                          aria-label="Adres"
                        />
                        <Textarea
                          value={r.notitie}
                          onChange={(e) => patch(r._id, { notitie: e.target.value })}
                          placeholder="Notitie"
                          rows={2}
                          aria-label="Notitie"
                        />
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => verwijder(r._id)}
                    className="mt-1 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Rij verwijderen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-3">
            <Button type="button" variant="ghost" onClick={() => setStap('invoer')}>
              Terug
            </Button>
            <Button type="button" onClick={importeer} loading={importeren} disabled={geselecteerd.length === 0}>
              Importeer {geselecteerd.length} {geselecteerd.length === 1 ? 'gast' : 'gasten'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
