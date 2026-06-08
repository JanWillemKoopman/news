'use client'

import { AlignCenter, AlignLeft, AlignRight, Settings2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import type { SectieConfig } from '@/lib/bruiloft/types'

import { FotoUpload } from '../FotoUpload'

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
  config: SectieConfig
  onSave: (patch: Partial<SectieConfig>) => void
  onUploadFoto: (file: File) => Promise<void>
  onVerwijderFoto?: () => void
  toonFotoUpload?: boolean
}

export function SectieInstellingen({ config, onSave, onUploadFoto, onVerwijderFoto, toonFotoUpload = true }: Props) {
  const [open, setOpen] = React.useState(false)
  const [naam, setNaam] = React.useState(config.naam)

  React.useEffect(() => { setNaam(config.naam) }, [config.naam])

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function onNaamWijziging(e: React.ChangeEvent<HTMLInputElement>) {
    const waarde = e.target.value
    setNaam(waarde)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSave({ naam: waarde }), 500)
  }

  const isZichtbaar = config.zichtbaar !== false

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-border bg-muted/20">
      {/* Compact header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          value={naam}
          onChange={onNaamWijziging}
          className="flex-1 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
          placeholder="Sectienaam"
        />

        {/* Visibility toggle */}
        <button
          role="switch"
          aria-checked={isZichtbaar}
          onClick={() => onSave({ zichtbaar: !isZichtbaar })}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            isZichtbaar ? 'bg-primary' : 'bg-input'
          )}
          title={isZichtbaar ? 'Verbergen' : 'Zichtbaar maken'}
        >
          <span
            className={cn(
              'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              isZichtbaar ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>

        {/* Gear icon: open advanced settings */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            open ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
          title="Sectie-opties"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded settings panel */}
      {open && (
        <div className="space-y-5 border-t border-border px-4 py-4">
          {/* Text alignment */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Uitlijning tekst
            </p>
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
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Achtergrond
            </p>
            <div className="flex flex-wrap gap-2">
              {ACHTERGROND_SWATCHES.map((s) => {
                const actief = (config.achtergrondKleur ?? 'transparant') === s.waarde
                return (
                  <button
                    key={s.waarde}
                    type="button"
                    title={s.label}
                    onClick={() => {
                      const donker = isdonker(s.waarde)
                      onSave({
                        achtergrondKleur: s.waarde === 'transparant' ? undefined : s.waarde,
                        tekstKleur: s.waarde === 'transparant' ? undefined : donker ? 'licht' : undefined,
                      })
                    }}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all hover:scale-110',
                      actief ? 'border-primary ring-1 ring-primary' : 'border-border'
                    )}
                    style={{
                      background: s.waarde === 'transparant'
                        ? 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 0 0/12px 12px'
                        : s.preview,
                    }}
                  />
                )
              })}
              {/* Custom color picker */}
              <label
                title="Aangepaste kleur"
                className={cn(
                  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-2 border-border text-[9px] font-bold text-muted-foreground transition-all hover:scale-110 hover:border-primary',
                  config.achtergrondKleur && !ACHTERGROND_SWATCHES.some(s => s.waarde === config.achtergrondKleur) ? 'border-primary' : ''
                )}
                style={config.achtergrondKleur && !ACHTERGROND_SWATCHES.some(s => s.waarde === config.achtergrondKleur)
                  ? { background: config.achtergrondKleur }
                  : {}}
              >
                +
                <input
                  type="color"
                  className="sr-only"
                  value={config.achtergrondKleur && config.achtergrondKleur !== 'transparant' ? config.achtergrondKleur : '#ffffff'}
                  onChange={(e) => {
                    const kleur = e.target.value
                    onSave({ achtergrondKleur: kleur, tekstKleur: isdonker(kleur) ? 'licht' : undefined })
                  }}
                />
              </label>
            </div>
          </div>

          {/* Section photo */}
          {toonFotoUpload && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sectie-afbeelding
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Een visuele afbeelding als header boven deze sectie op jullie trouwwebsite.
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
      )}
    </div>
  )
}
