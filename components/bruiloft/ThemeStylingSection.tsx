'use client'

import { Loader2, Palette, Sparkles, Wand2 } from 'lucide-react'
import * as React from 'react'

import { ALL_FONT_VARIABLES } from '@/app/fonts'
import { Button, Card, CardContent, Field, Textarea, useToast } from '@/components/bruiloft/ui'
import { PublicRsvp, type PublicWeddingData } from '@/components/rsvp/PublicRsvp'
import { ThemeProvider } from '@/components/rsvp/ThemeProvider'
import { THEME_PRESETS, type ThemeConfig } from '@/lib/bruiloft/theme'
import { useBruiloftStore } from '@/store/bruiloftStore'

// AI-styling sectie op de website-pagina.
//
// Flow:
//   1. Gebruiker kiest preset of typt eigen prompt.
//   2. Klikt "Genereer thema" → POST /api/style/generate → ontvangt ThemeConfig.
//   3. Live preview rendert PublicRsvp met dat thema (dummy gast-data).
//   4. Klikt "Opslaan" → POST /api/style/save → opgeslagen versie wordt
//      meteen actief op de publieke /rsvp/[token]-pagina.

export function ThemeStylingSection() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const refreshWebsiteContent = useBruiloftStore((s) => s.refreshWebsiteContent)
  const { toast } = useToast()

  const [prompt, setPrompt] = React.useState('')
  const [generating, setGenerating] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [previewTheme, setPreviewTheme] = React.useState<ThemeConfig | null>(null)

  const savedTheme = websiteContent?.theme ?? null

  const previewData: PublicWeddingData = React.useMemo(
    () => ({
      wedding: {
        partner1Naam: wedding?.partner1Naam || 'Partner 1',
        partner2Naam: wedding?.partner2Naam || 'Partner 2',
        trouwdatum: wedding?.trouwdatum || null,
        locatie: wedding?.locatie || '',
      },
      content: websiteContent
        ? {
            welkomsttekst: websiteContent.welkomsttekst,
            dresscode: websiteContent.dresscode,
            cadeaulijst: websiteContent.cadeaulijst,
            hotels: websiteContent.hotels,
            routebeschrijving: websiteContent.routebeschrijving,
            contact: websiteContent.contact,
          }
        : null,
      schedule: [],
      guest: {
        voornaam: 'Voorbeeld',
        achternaam: 'Gast',
        rsvpStatus: 'uitgenodigd',
        dieetwensen: '',
        heeftPartner: false,
        partnerNaam: '',
        aantalKinderen: 0,
        rsvpSubmittedAt: null,
      },
    }),
    [wedding, websiteContent],
  )

  if (!wedding) return null

  async function generate() {
    if (prompt.trim().length < 3) {
      toast({
        title: 'Vul een korte beschrijving in',
        description: 'Type bv. "warme aardetinten, botanisch" of kies een snelstart.',
        variant: 'error',
      })
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/style/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentTheme: previewTheme ?? savedTheme ?? undefined }),
      })
      const data = (await res.json()) as { theme?: ThemeConfig; error?: string }
      if (!res.ok || !data.theme) {
        toast({
          title: 'Genereren mislukt',
          description: data.error ?? 'Probeer een andere formulering.',
          variant: 'error',
        })
        return
      }
      setPreviewTheme(data.theme)
    } catch {
      toast({
        title: 'Geen verbinding',
        description: 'Controleer je internet en probeer het opnieuw.',
        variant: 'error',
      })
    } finally {
      setGenerating(false)
    }
  }

  async function save() {
    if (!previewTheme || !wedding) return
    setSaving(true)
    try {
      const res = await fetch('/api/style/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding.id, theme: previewTheme }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        toast({
          title: 'Opslaan mislukt',
          description: data.error ?? 'Probeer het opnieuw.',
          variant: 'error',
        })
        return
      }
      await refreshWebsiteContent()
      setPreviewTheme(null)
      toast({
        title: 'Vormgeving opgeslagen',
        description: 'Gasten zien je nieuwe stijl meteen op de RSVP-pagina.',
        variant: 'success',
      })
    } catch {
      toast({
        title: 'Geen verbinding',
        description: 'Controleer je internet en probeer het opnieuw.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const themeToShow = previewTheme ?? savedTheme

  return (
    <Card className="mb-6">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-foreground">Vormgeving met AI</h2>
            <p className="text-sm text-muted-foreground">
              Beschrijf de sfeer die jullie willen — Gemini stelt een passend palet en
              lettertype voor. Bekijk de preview en sla op als je tevreden bent.
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Snelstart
          </p>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map((p) => (
              <Button
                key={p.key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrompt(p.prompt)}
              >
                <Sparkles className="h-3.5 w-3.5" /> {p.label}
              </Button>
            ))}
          </div>
        </div>

        <Field label="Beschrijf de sfeer" htmlFor="ai-prompt">
          <Textarea
            id="ai-prompt"
            rows={3}
            placeholder='Bijv. "Een romantische bruiloft in een Toscaans wijngaard: warme oker- en olijfgroene tinten, klassieke serif voor de namen, zachte afronding."'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={generate} disabled={generating || saving}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Genereer thema
          </Button>
          {previewTheme ? (
            <>
              <Button type="button" variant="default" onClick={save} loading={saving}>
                Opslaan
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPreviewTheme(null)}
                disabled={saving}
              >
                Verwerpen
              </Button>
              <span className="text-xs text-muted-foreground">
                Preview niet opgeslagen — gasten zien nog je huidige vormgeving.
              </span>
            </>
          ) : savedTheme ? (
            <span className="text-xs text-muted-foreground">
              Een AI-thema staat actief op je publieke pagina.
            </span>
          ) : null}
        </div>

        {/* Preview-pane */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Live preview
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className={`${ALL_FONT_VARIABLES} max-h-[640px] overflow-y-auto`}>
              <ThemeProvider theme={themeToShow} className="bg-background">
                <PublicRsvp token="preview" data={previewData} />
              </ThemeProvider>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Dit is hoe gasten je pagina straks zien. De RSVP-knoppen werken niet in de preview.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
