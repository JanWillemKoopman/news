'use client'

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Camera,
  CalendarDays,
  ChevronDown,
  Clock,
  Gift,
  GripVertical,
  HelpCircle,
  Home,
  Hotel,
  MapPin,
  Phone,
  Shirt,
} from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import type {
  SectieConfig,
  WebsiteContent,
  WebsiteContentInput,
  Wedding,
} from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { FaqEditor } from './editors/FaqEditor'
import { FotoGalerijEditor } from './editors/FotoGalerijEditor'
import { HomeEditor } from './editors/HomeEditor'
import { TekstEditor } from './editors/TekstEditor'
import { FotoUpload } from './FotoUpload'
import { RsvpSectie } from './RsvpSectie'
import type { SectieSleutel } from './PaginaSidebar'
import { SECTIES_VOLGORDE } from './PaginaSidebar'
import type { useDebounceOpslaan } from './useDebounceOpslaan'

const SECTIE_ICONS: Record<SectieSleutel, React.ElementType> = {
  home: Home,
  countdown: Clock,
  programma: CalendarDays,
  dresscode: Shirt,
  cadeaulijst: Gift,
  hotels: Hotel,
  routebeschrijving: MapPin,
  contact: Phone,
  faq: HelpCircle,
  fotos: Camera,
}

const SECTIE_STANDAARD_NAAM: Partial<Record<SectieSleutel, string>> = {
  home: 'Home',
  countdown: 'Aftelling',
  programma: 'Programma',
  dresscode: 'Dresscode',
  cadeaulijst: 'Cadeaulijst',
  hotels: 'Overnachten',
  routebeschrijving: 'Route',
  contact: 'Contact',
  faq: 'FAQ',
  fotos: "Foto's",
}

const ACHTERGROND_SWATCHES: { waarde: string; label: string; preview: string }[] = [
  { waarde: 'transparant', label: 'Standaard', preview: 'transparent' },
  { waarde: '#ffffff', label: 'Wit', preview: '#ffffff' },
  { waarde: '#f5f5f0', label: 'Crème', preview: '#f5f5f0' },
  { waarde: '#fdf0f5', label: 'Zachtroze', preview: '#fdf0f5' },
  { waarde: '#f0f7f0', label: 'Zachtgroen', preview: '#f0f7f0' },
  { waarde: '#f0f5fd', label: 'Lichtblauw', preview: '#f0f5fd' },
  { waarde: '#fdf5e8', label: 'Champagne', preview: '#fdf5e8' },
  { waarde: '#2d2d2d', label: 'Donker', preview: '#2d2d2d' },
]

function isdonker(hex: string): boolean {
  if (!hex || hex === 'transparant') return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

interface Props {
  websiteContent: WebsiteContent
  wedding: Wedding
  debounce: ReturnType<typeof useDebounceOpslaan<WebsiteContentInput>>
  onToggleSectie: (s: SectieSleutel, zichtbaar: boolean) => void
  onSaveSectieConfig: (s: SectieSleutel, patch: Partial<SectieConfig>) => void
  onHerorden: (nieuweVolgorde: SectieSleutel[]) => void
}

export function SectieAccordionLijst({
  websiteContent,
  wedding,
  debounce,
  onToggleSectie,
  onSaveSectieConfig,
  onHerorden,
}: Props) {
  const [openSectie, setOpenSectie] = React.useState<SectieSleutel | null>(null)
  const [draggingKey, setDraggingKey] = React.useState<SectieSleutel | null>(null)
  const [dragOverKey, setDragOverKey] = React.useState<SectieSleutel | null>(null)

  function getSectieConfig(s: SectieSleutel): SectieConfig {
    return (
      websiteContent.sectiesConfig[s] ?? {
        zichtbaar: true,
        naam: SECTIE_STANDAARD_NAAM[s] ?? s,
      }
    )
  }

  const geordend = React.useMemo(() => {
    const nonHome = SECTIES_VOLGORDE.filter((s) => s !== 'home')
    const sorted = [...nonHome].sort((a, b) => {
      const va = websiteContent.sectiesConfig[a]?.volgorde ?? SECTIES_VOLGORDE.indexOf(a)
      const vb = websiteContent.sectiesConfig[b]?.volgorde ?? SECTIES_VOLGORDE.indexOf(b)
      return va - vb
    })
    return ['home' as SectieSleutel, ...sorted]
  }, [websiteContent.sectiesConfig])

  function handleDrop(targetKey: SectieSleutel) {
    if (
      !draggingKey ||
      draggingKey === targetKey ||
      draggingKey === 'home' ||
      targetKey === 'home'
    )
      return
    const fromIdx = geordend.indexOf(draggingKey)
    const toIdx = geordend.indexOf(targetKey)
    if (fromIdx === -1 || toIdx === -1) return
    const newOrder = [...geordend]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggingKey)
    onHerorden(newOrder)
    setDraggingKey(null)
    setDragOverKey(null)
  }

  const verborgenCount = Object.values(websiteContent.sectiesConfig).filter(
    (s) => s.zichtbaar === false
  ).length

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Pagina-secties</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {geordend.length - verborgenCount} van {geordend.length} secties zichtbaar
          </p>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Versleep om volgorde te wijzigen
        </p>
      </div>

      {/* Section rows */}
      {geordend.map((s, i) => {
        const config = getSectieConfig(s)
        const isLast = i === geordend.length - 1
        const isDragging = draggingKey === s
        const isDragOver =
          dragOverKey === s && draggingKey !== s && draggingKey !== 'home'

        return (
          <SectieRijItem
            key={s}
            s={s}
            config={config}
            isOpen={openSectie === s}
            isLast={isLast}
            isDragging={isDragging}
            isDragOver={isDragOver}
            websiteContent={websiteContent}
            wedding={wedding}
            debounce={debounce}
            onToggleOpen={() => setOpenSectie(openSectie === s ? null : s)}
            onToggleSectie={onToggleSectie}
            onSaveSectieConfig={onSaveSectieConfig}
            onDragStart={() => setDraggingKey(s)}
            onDragOver={(e) => {
              e.preventDefault()
              if (s !== draggingKey && s !== 'home') setDragOverKey(s)
            }}
            onDrop={() => handleDrop(s)}
            onDragEnd={() => {
              setDraggingKey(null)
              setDragOverKey(null)
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Individual section row ─────────────────────────────────────────────────

interface SectieRijItemProps {
  s: SectieSleutel
  config: SectieConfig
  isOpen: boolean
  isLast: boolean
  isDragging: boolean
  isDragOver: boolean
  websiteContent: WebsiteContent
  wedding: Wedding
  debounce: ReturnType<typeof useDebounceOpslaan<WebsiteContentInput>>
  onToggleOpen: () => void
  onToggleSectie: (s: SectieSleutel, zichtbaar: boolean) => void
  onSaveSectieConfig: (s: SectieSleutel, patch: Partial<SectieConfig>) => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

function SectieRijItem({
  s,
  config,
  isOpen,
  isLast,
  isDragging,
  isDragOver,
  websiteContent,
  wedding,
  debounce,
  onToggleOpen,
  onToggleSectie,
  onSaveSectieConfig,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SectieRijItemProps) {
  const uploadSectieFoto = useBruiloftStore((s) => s.uploadSectieFoto)

  const isVerborgen = s !== 'home' && config.zichtbaar === false
  const Icon = SECTIE_ICONS[s]

  // Inline name editing
  const [naam, setNaam] = React.useState(
    config.naam || SECTIE_STANDAARD_NAAM[s] || s
  )
  const naamTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    setNaam(config.naam || SECTIE_STANDAARD_NAAM[s] || s)
  }, [config.naam, s])

  function onNaamWijziging(e: React.ChangeEvent<HTMLInputElement>) {
    const waarde = e.target.value
    setNaam(waarde)
    if (naamTimerRef.current) clearTimeout(naamTimerRef.current)
    naamTimerRef.current = setTimeout(
      () => onSaveSectieConfig(s, { naam: waarde }),
      500
    )
  }

  return (
    <div
      draggable={s !== 'home'}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', s)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        !isLast ? 'border-b border-border' : '',
        isDragging ? 'opacity-40' : '',
        isDragOver ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : ''
      )}
    >
      {/* Row header */}
      <div
        className={cn(
          'flex items-center gap-2.5 px-4 py-3.5 sm:gap-3 sm:px-5',
          isOpen ? 'bg-muted/20' : ''
        )}
      >
        {/* Drag handle (fixed-width so alignment stays clean) */}
        <div className="w-5 shrink-0">
          {s !== 'home' && (
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/30 transition-colors hover:text-muted-foreground/70" />
          )}
        </div>

        {/* Section icon chip */}
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
            isOpen ? 'bg-primary/10' : 'bg-muted/60',
            isVerborgen ? 'opacity-40' : ''
          )}
        >
          <Icon
            className={cn(
              'h-3.5 w-3.5',
              isOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>

        {/* Section name (click to toggle open/close) */}
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex-1 text-left"
        >
          <span
            className={cn(
              'text-sm font-medium text-foreground transition-opacity',
              isVerborgen ? 'opacity-40' : ''
            )}
          >
            {config.naam || SECTIE_STANDAARD_NAAM[s] || s}
          </span>
        </button>

        {/* Visibility toggle (not for home) */}
        {s !== 'home' ? (
          <button
            role="switch"
            aria-checked={!isVerborgen}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSectie(s, isVerborgen)
            }}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              !isVerborgen ? 'bg-primary' : 'bg-input'
            )}
            title={!isVerborgen ? 'Verbergen' : 'Zichtbaar maken'}
          >
            <span
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
                !isVerborgen ? 'left-6' : 'left-1'
              )}
            />
          </button>
        ) : (
          <div className="w-12 shrink-0" />
        )}

        {/* Expand/collapse chevron */}
        <button
          type="button"
          onClick={onToggleOpen}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={isOpen ? 'Inklappen' : 'Uitklappen'}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Expanded editor content */}
      {isOpen && (
        <div className="border-t border-border bg-background px-4 py-5 sm:px-5 sm:py-6">
          {/* Sectienaam editor (non-home) */}
          {s !== 'home' && (
            <div className="mb-5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sectienaam
              </p>
              <input
                value={naam}
                onChange={onNaamWijziging}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="Naam van deze sectie…"
              />
            </div>
          )}

          {/* Content editor */}
          <div className={cn('mb-5', s !== 'home' && 'border-b border-border pb-5')}>
            <SectieEditor
              s={s}
              websiteContent={websiteContent}
              wedding={wedding}
              debounce={debounce}
              config={config}
              onSaveSectieConfig={(patch) => onSaveSectieConfig(s, patch)}
            />
          </div>

          {/* Layout settings (non-home only) */}
          {s !== 'home' && (
            <SectieLayoutInstellingen
              config={config}
              onSave={(patch) => onSaveSectieConfig(s, patch)}
              onUploadFoto={(file) =>
                uploadSectieFoto(s, file).then(() => undefined)
              }
              onVerwijderFoto={() => onSaveSectieConfig(s, { fotoUrl: undefined })}
              toonFotoUpload={s !== 'fotos'}
            />
          )}

          {/* RSVP below home content */}
          {s === 'home' && <RsvpSectie />}
        </div>
      )}
    </div>
  )
}

// ─── Section content router ──────────────────────────────────────────────────

interface SectieEditorProps {
  s: SectieSleutel
  websiteContent: WebsiteContent
  wedding: Wedding
  debounce: ReturnType<typeof useDebounceOpslaan<WebsiteContentInput>>
  config: SectieConfig
  onSaveSectieConfig: (patch: Partial<SectieConfig>) => void
}

function SectieEditor({ s, websiteContent, wedding, debounce, config, onSaveSectieConfig }: SectieEditorProps) {
  switch (s) {
    case 'home':
      return (
        <HomeEditor
          welkomsttekst={websiteContent.welkomsttekst}
          headerFotoUrl={websiteContent.headerFotoUrl}
          debounce={debounce}
        />
      )

    case 'programma':
      return (
        <ProgrammaEditor
          inhoud={config.inhoud ?? ''}
          onSave={(inhoud) => onSaveSectieConfig({ inhoud })}
        />
      )

    case 'countdown':
      return (
        <CountdownEditor
          datum={config.countdownDatum ?? ''}
          onSave={(countdownDatum) => onSaveSectieConfig({ countdownDatum })}
        />
      )

    case 'dresscode':
      return (
        <TekstEditor
          veld="dresscode"
          label="Dresscode"
          waarde={websiteContent.dresscode}
          debounce={debounce}
          placeholder="Bijv. Formeel, feestelijk casual…"
          toelichting="Omschrijf de gewenste kledingstijl voor jullie gasten."
        />
      )

    case 'cadeaulijst':
      return (
        <TekstEditor
          veld="cadeaulijst"
          label="Cadeaulijst"
          waarde={websiteContent.cadeaulijst}
          debounce={debounce}
          placeholder="Link naar jullie cadeaulijst of aanwijzingen…"
          toelichting="Deel een link naar jullie online cadeaulijst of geef instructies."
        />
      )

    case 'hotels':
      return (
        <TekstEditor
          veld="hotels"
          label="Overnachten"
          waarde={websiteContent.hotels}
          debounce={debounce}
          placeholder="Suggesties voor hotels of B&B's in de buurt…"
          toelichting="Help gasten die van ver komen met overnachtingsopties."
        />
      )

    case 'routebeschrijving':
      return (
        <TekstEditor
          veld="routebeschrijving"
          label="Route"
          waarde={websiteContent.routebeschrijving}
          debounce={debounce}
          placeholder="Adres, routebeschrijving of parkeertips…"
          toelichting="Geef gasten uitleg over hoe ze de locatie bereiken."
        />
      )

    case 'contact':
      return (
        <TekstEditor
          veld="contact"
          label="Contact"
          waarde={websiteContent.contact}
          debounce={debounce}
          meerdereRegels={false}
          placeholder="E-mail of telefoonnummer voor vragen…"
          toelichting="Contactgegevens voor gasten met vragen."
        />
      )

    case 'faq':
      return <FaqEditor faq={websiteContent.faq} />

    case 'fotos':
      return <FotoGalerijEditor />
  }
}

// ─── Programma free-text editor ─────────────────────────────────────────────

function ProgrammaEditor({ inhoud, onSave }: { inhoud: string; onSave: (v: string) => void }) {
  const [waarde, setWaarde] = React.useState(inhoud)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => { setWaarde(inhoud) }, [inhoud])

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    setWaarde(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSave(v), 500)
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Programma</label>
      <p className="text-xs text-muted-foreground">
        Beschrijf het verloop van de dag voor jullie gasten.
      </p>
      <textarea
        value={waarde}
        onChange={onChange}
        rows={6}
        placeholder="Bijv. 14:00 Ceremonie — 15:00 Cocktailreceptie — 17:00 Diner…"
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20"
      />
    </div>
  )
}

// ─── Countdown date editor ───────────────────────────────────────────────────

function CountdownEditor({ datum, onSave }: { datum: string; onSave: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="countdown-datum">
          Aftellingsdatum
        </label>
        <p className="text-xs text-muted-foreground">
          De datum waarnaar de aftelling telt. Laat leeg om de trouwdatum te gebruiken.
        </p>
        <input
          id="countdown-datum"
          type="date"
          value={datum}
          onChange={(e) => onSave(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </div>
      {datum && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            Aftelling telt naar{' '}
            <span className="font-medium text-foreground">
              {new Date(datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Layout settings (alignment, background, photo) ─────────────────────────

interface SectieLayoutInstellingenProps {
  config: SectieConfig
  onSave: (patch: Partial<SectieConfig>) => void
  onUploadFoto: (file: File) => Promise<void>
  onVerwijderFoto?: () => void
  toonFotoUpload?: boolean
}

function SectieLayoutInstellingen({
  config,
  onSave,
  onUploadFoto,
  onVerwijderFoto,
  toonFotoUpload = true,
}: SectieLayoutInstellingenProps) {
  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Weergave-instellingen
      </p>

      {/* Text alignment */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Uitlijning tekst</p>
        <div className="flex gap-2">
          {(
            [
              { val: 'links', label: 'Links', Icon: AlignLeft },
              { val: 'midden', label: 'Midden', Icon: AlignCenter },
              { val: 'rechts', label: 'Rechts', Icon: AlignRight },
            ] as const
          ).map(({ val, label, Icon }) => (
            <button
              key={val}
              type="button"
              onClick={() => onSave({ uitlijning: val })}
              title={label}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                (config.uitlijning ?? 'midden') === val
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background color */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Achtergrondkleur</p>
        <div className="flex flex-wrap gap-2">
          {ACHTERGROND_SWATCHES.map((swatch) => {
            const actief = (config.achtergrondKleur ?? 'transparant') === swatch.waarde
            return (
              <button
                key={swatch.waarde}
                type="button"
                title={swatch.label}
                onClick={() => {
                  const donker = isdonker(swatch.waarde)
                  onSave({
                    achtergrondKleur:
                      swatch.waarde === 'transparant' ? undefined : swatch.waarde,
                    tekstKleur:
                      swatch.waarde === 'transparant'
                        ? undefined
                        : donker
                          ? 'licht'
                          : undefined,
                  })
                }}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all hover:scale-110',
                  actief ? 'border-primary ring-1 ring-primary' : 'border-border'
                )}
                style={{
                  background:
                    swatch.waarde === 'transparant'
                      ? 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 0 0/12px 12px'
                      : swatch.preview,
                }}
              />
            )
          })}
          {/* Custom color picker */}
          <label
            title="Aangepaste kleur"
            className={cn(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-2 border-border text-[9px] font-bold text-muted-foreground transition-all hover:scale-110 hover:border-primary',
              config.achtergrondKleur &&
                !ACHTERGROND_SWATCHES.some((sw) => sw.waarde === config.achtergrondKleur)
                ? 'border-primary'
                : ''
            )}
            style={
              config.achtergrondKleur &&
              !ACHTERGROND_SWATCHES.some((sw) => sw.waarde === config.achtergrondKleur)
                ? { background: config.achtergrondKleur }
                : {}
            }
          >
            +
            <input
              type="color"
              className="sr-only"
              value={
                config.achtergrondKleur && config.achtergrondKleur !== 'transparant'
                  ? config.achtergrondKleur
                  : '#ffffff'
              }
              onChange={(e) => {
                const kleur = e.target.value
                onSave({
                  achtergrondKleur: kleur,
                  tekstKleur: isdonker(kleur) ? 'licht' : undefined,
                })
              }}
            />
          </label>
        </div>
      </div>

      {/* Section photo */}
      {toonFotoUpload && (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Sectie-afbeelding</p>
          <p className="mb-2.5 text-xs text-muted-foreground/70">
            Een visuele afbeelding als header boven deze sectie.
          </p>
          <FotoUpload
            huidigUrl={config.fotoUrl ?? ''}
            onUpload={onUploadFoto}
            onVerwijder={config.fotoUrl ? onVerwijderFoto : undefined}
            label="Afbeelding toevoegen"
            aanbevolenAfmeting="Aanbevolen: 1200×400px"
          />
        </div>
      )}
    </div>
  )
}
