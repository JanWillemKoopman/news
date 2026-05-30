'use client'

import { AlignCenter, AlignLeft, AlignRight, Settings2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import type { SectieConfig } from '@/lib/bruiloft/types'

import { FotoUpload } from '../FotoUpload'

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
