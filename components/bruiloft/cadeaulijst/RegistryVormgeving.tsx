'use client'

import { Check } from 'lucide-react'
import * as React from 'react'

import { Button, Card, CardContent, Input, useToast } from '@/components/bruiloft/ui'
import type { WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

const FONT_PREVIEW_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&family=Dancing+Script:wght@400;700&family=EB+Garamond:wght@400;700&family=Great+Vibes&family=Lora:wght@400;700&family=Playfair+Display:wght@400;700&display=swap'

const THEMAS: {
  id: WeddingThema
  naam: string
  beschrijving: string
  palette: [string, string, string]
  accentKleur: string
  kopLettertype: WeddingLettertype
}[] = [
  { id: 'klassiek',       naam: 'The Atelier',   beschrijving: 'Ornamentele typografie & tijdloos gecentreerd', palette: ['#a78ba8', '#faf0f5', '#3d2040'], accentKleur: '#a78ba8', kopLettertype: 'cormorant' },
  { id: 'modern',         naam: 'The Editor',    beschrijving: 'Asymmetrisch split-hero & editoriaal bold',     palette: ['#1c1c2e', '#f8f8fc', '#4a4a6a'], accentKleur: '#1c1c2e', kopLettertype: 'playfair' },
  { id: 'romantisch',     naam: 'Le Jardin',     beschrijving: 'Warm blush, botanische ornamenten & zacht',     palette: ['#c2829a', '#fef3ef', '#7a3a50'], accentKleur: '#c2829a', kopLettertype: 'dancing-script' },
  { id: 'rustiek',        naam: 'Het Landgoed',  beschrijving: 'Donkere nav, linnen secties & warm organisch',  palette: ['#8b6341', '#faf5eb', '#3d2a1a'], accentKleur: '#8b6341', kopLettertype: 'lora' },
  { id: 'minimalistisch', naam: 'Studio',        beschrijving: 'Gigantische typografie & maximale witruimte',   palette: ['#1a1a1a', '#ffffff', '#606060'], accentKleur: '#1a1a1a', kopLettertype: 'eb-garamond' },
  { id: 'botanisch',      naam: 'De Tuin',       beschrijving: 'Groene nav, botanische details & warm groen',   palette: ['#2d5a27', '#f0f7f0', '#1a3a16'], accentKleur: '#2d5a27', kopLettertype: 'great-vibes' },
]

const LETTERTYPES: { id: WeddingLettertype; naam: string; voorbeeld: string; fontFamily: string }[] = [
  { id: 'cormorant',      naam: 'Cormorant', voorbeeld: 'Jullie dag', fontFamily: '"Cormorant Garamond", serif' },
  { id: 'playfair',       naam: 'Playfair',  voorbeeld: 'Jullie dag', fontFamily: '"Playfair Display", serif' },
  { id: 'lora',           naam: 'Lora',      voorbeeld: 'Jullie dag', fontFamily: '"Lora", serif' },
  { id: 'dancing-script', naam: 'Dancing',   voorbeeld: 'Jullie dag', fontFamily: '"Dancing Script", cursive' },
  { id: 'eb-garamond',    naam: 'Garamond',  voorbeeld: 'Jullie dag', fontFamily: '"EB Garamond", serif' },
  { id: 'great-vibes',    naam: 'Vibes',     voorbeeld: 'Jullie dag', fontFamily: '"Great Vibes", cursive' },
]

const KLEUR_PRESETS = [
  '#a75573', '#c2785e', '#d4a853', '#7c6b4f',
  '#334155', '#2d6a4f', '#5c6bc0', '#8b4513',
  '#1a1a1a', '#6b7280', '#c9a96e', '#6b4c7a',
]

export function RegistryVormgeving() {
  const registrySettings = useBruiloftStore((s) => s.registrySettings)
  const saveRegistrySettings = useBruiloftStore((s) => s.saveRegistrySettings)
  const { toast } = useToast()

  const [kleurAccent, setKleurAccent] = React.useState(registrySettings?.kleurAccent ?? '#a75573')
  const [saving, setSaving] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    setKleurAccent(registrySettings?.kleurAccent ?? '#a75573')
  }, [registrySettings?.kleurAccent])

  // Load Google Fonts for live preview
  React.useEffect(() => {
    if (typeof document === 'undefined') return
    const FONT_ID = 'wedding-font-preview'
    if (document.getElementById(FONT_ID)) return
    const link = document.createElement('link')
    link.id = FONT_ID
    link.rel = 'stylesheet'
    link.href = FONT_PREVIEW_URL
    document.head.appendChild(link)
  }, [])

  const stelKleur = (waarde: string) => {
    setKleurAccent(waarde)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await saveRegistrySettings({ kleurAccent: waarde })
      } catch {
        toast({ title: 'Opslaan mislukt', variant: 'error' })
      }
    }, 400)
  }

  const stelThema = async (thema: WeddingThema, accentKleur: string, kopLettertype: WeddingLettertype) => {
    setSaving(true)
    try {
      await saveRegistrySettings({ thema, kleurAccent: accentKleur, kopLettertype })
      setKleurAccent(accentKleur)
      toast({ title: 'Template opgeslagen', variant: 'success' })
    } catch {
      toast({ title: 'Opslaan mislukt', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const stelLettertype = async (kopLettertype: WeddingLettertype) => {
    try {
      await saveRegistrySettings({ kopLettertype })
    } catch {
      toast({ title: 'Opslaan mislukt', variant: 'error' })
    }
  }

  const huidigThema = registrySettings?.thema ?? 'klassiek'
  const huidigFont = registrySettings?.kopLettertype ?? 'cormorant'

  return (
    <div className="space-y-5">
      {/* Template */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-1 font-medium text-foreground">Template</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Kies de stijl voor de publieke cadeaulijstpagina. Dit staat los van de trouwwebsite.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEMAS.map((t) => {
              const gekozen = huidigThema === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => stelThema(t.id, t.accentKleur, t.kopLettertype)}
                  disabled={saving}
                  className={
                    'relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all disabled:opacity-60 ' +
                    (gekozen ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')
                  }
                >
                  {gekozen && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <div className="relative overflow-hidden rounded-lg h-14" style={{ background: t.palette[1] }}>
                    <div className="absolute top-0 inset-x-0 h-3.5 flex items-center px-2 gap-1" style={{ background: t.palette[0] }}>
                      <div className="h-0.5 flex-1 rounded" style={{ background: 'rgba(255,255,255,0.4)' }} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center mt-3.5">
                      <div className="space-y-1 text-center">
                        <div className="h-1.5 rounded mx-auto" style={{ background: t.palette[0] + 'aa', width: '55%' }} />
                        <div className="h-1 rounded mx-auto" style={{ background: t.palette[0] + '55', width: '35%' }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {t.palette.map((kleur, i) => (
                      <div key={i} className="h-2 flex-1 first:rounded-l last:rounded-r" style={{ background: kleur }} />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{t.naam}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{t.beschrijving}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Accentkleur */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-1 font-medium text-foreground">Accentkleur</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            De hoofdkleur van de cadeaulijstpagina — gebruikt voor knoppen en accenten.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={kleurAccent}
                onChange={(e) => stelKleur(e.target.value)}
                className="h-11 w-11 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              />
              <Input
                value={kleurAccent}
                onChange={(e) => stelKleur(e.target.value)}
                className="w-32 font-mono text-sm uppercase"
                maxLength={7}
                placeholder="#a75573"
              />
            </div>
            <div className="grid grid-cols-6 gap-2">
              {KLEUR_PRESETS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => stelKleur(k)}
                  className={
                    'aspect-square w-full rounded-lg border-2 shadow-sm transition-transform hover:scale-110 ' +
                    (kleurAccent === k ? 'border-foreground' : 'border-transparent')
                  }
                  style={{ background: k }}
                  title={k}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Koplettertype */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="mb-1 font-medium text-foreground">Koplettertype</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Het lettertype voor titels op de cadeaulijstpagina.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {LETTERTYPES.map((l) => {
              const gekozen = huidigFont === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => stelLettertype(l.id)}
                  className={
                    'flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-4 transition-all ' +
                    (gekozen ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')
                  }
                >
                  <span className="text-2xl leading-none text-foreground" style={{ fontFamily: l.fontFamily }}>
                    {l.voorbeeld}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{l.naam}</span>
                  {gekozen && <Check className="h-3 w-3 text-primary" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
