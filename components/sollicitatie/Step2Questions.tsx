'use client'

import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, SlidersHorizontal, Star, Target } from 'lucide-react'
import { useCoverLetterStore } from '@/store/coverLetterStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { YesNoAnswer } from '@/types/cover-letter'

export default function Step2Questions() {
  const {
    analysis,
    answers,
    yesNoAnswers,
    extraInstructions,
    motivation,
    uniqueValue,
    setAnswer,
    setYesNoAnswer,
    setExtraInstructions,
    setMotivation,
    setUniqueValue,
    setStep,
  } = useCoverLetterStore()

  if (!analysis) return null

  const yesNoQuestions = analysis.yesNoQuestions ?? []
  const answeredCount = yesNoAnswers.filter((a) => a === 'yes' || a === 'no').length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Gap-analyse &amp; verdiepende vragen
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Beantwoord de vragen kort en informeel (steekwoorden mag). Hoe concreter je
          voorbeelden, hoe sterker je brief. Vragen overslaan kan, maar wordt afgeraden.
        </p>
      </div>

      {/* Motivatie */}
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star size={16} className="text-primary" />
            Waarom dit bedrijf?
            <span className="ml-auto text-xs font-normal text-primary">
              Vul in voor een significant betere brief
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="motivation" className="text-sm text-muted-foreground block">
            Waarom wil je SPECIFIEK bij dit bedrijf werken? Noem 1–2 concrete dingen — het
            product, de missie, de cultuur, iets wat je las. Niet wat jij kunt bieden, maar wat
            jou aantrekt.
          </Label>
          <Textarea
            id="motivation"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Bijv.: Ik gebruik hun product dagelijks en zie hoe het X oplost. De missie om Y te bereiken spreekt me aan omdat..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Unieke waardepropositie */}
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb size={16} className="text-primary" />
            Wat maakt jou uniek?
            <span className="ml-auto text-xs font-normal text-primary">
              Vul in voor een significant betere brief
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="unique-value" className="text-sm text-muted-foreground block">
            Wat maakt jou een betere kandidaat dan de gemiddelde sollicitant? Denk aan de
            combinatie van vaardigheden, ervaringen of perspectieven die anderen waarschijnlijk
            niet hebben.
          </Label>
          <Textarea
            id="unique-value"
            value={uniqueValue}
            onChange={(e) => setUniqueValue(e.target.value)}
            placeholder="Bijv.: Ik combineer X jaar ervaring in A met een achtergrond in B, waardoor ik als enige..."
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target size={16} className="text-primary" />
            Wat de analist zag
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-card-foreground">
            {analysis.gapAnalysis}
          </p>
          {analysis.companyDna.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Company DNA
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.companyDna.map((dna) => (
                  <Badge key={dna} variant="secondary">
                    {dna}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {yesNoQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" />
              Snelle bevestigingen
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {answeredCount} van {yesNoQuestions.length} beantwoord
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Klik per stelling ja, nee of sla over — bevestigde feiten komen mee in je
              brief, ontkende worden niet geclaimd.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {yesNoQuestions.map((statement, i) => {
              const current = yesNoAnswers[i] ?? null
              return (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 border-b border-border/60 last:border-b-0"
                >
                  <span className="text-sm leading-snug flex-1">{statement}</span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <YesNoPill
                      label="Ja"
                      active={current === 'yes'}
                      activeClass="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setYesNoAnswer(i, 'yes')}
                    />
                    <YesNoPill
                      label="Nee"
                      active={current === 'no'}
                      activeClass="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setYesNoAnswer(i, 'no')}
                    />
                    <YesNoPill
                      label="Sla over"
                      active={current === null}
                      activeClass="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      onClick={() => setYesNoAnswer(i, null)}
                      muted
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {analysis.starrQuestions.map((question, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Label
                htmlFor={`answer-${i}`}
                className="flex gap-2.5 mb-3 leading-relaxed cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm">{question}</span>
              </Label>
              <Textarea
                id={`answer-${i}`}
                value={answers[i] ?? ''}
                onChange={(e) => setAnswer(i, e.target.value)}
                placeholder="Jouw antwoord..."
                rows={4}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Extra instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-primary" />
            Extra instructies voor de AI
            <span className="text-xs font-normal text-muted-foreground ml-1">(optioneel)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="extra-instructions" className="text-sm text-muted-foreground mb-2 block">
            Geef hier aanvullende context of wensen mee die de AI moet meenemen bij het schrijven
            van de brief. Bijv. &quot;Gebruik een formele toon&quot;, &quot;Noem specifiek mijn
            ervaringen in de zorg&quot;, of &quot;Richt je op groeipotentieel&quot;.
          </Label>
          <Textarea
            id="extra-instructions"
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            placeholder="Bijv.: Focus extra op mijn leiderschapservaring. Houd de toon informeel maar professioneel."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep(1)}>
          <ArrowLeft size={16} />
          Terug
        </Button>
        <Button size="lg" onClick={() => setStep(3)}>
          Genereer mijn brief
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  )
}

function YesNoPill({
  label,
  active,
  activeClass,
  onClick,
  muted = false,
}: {
  label: string
  active: boolean
  activeClass: string
  onClick: () => void
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
        active
          ? `${activeClass} border-transparent`
          : muted
            ? 'border-border text-muted-foreground hover:bg-muted'
            : 'border-border hover:bg-muted'
      )}
    >
      {label}
    </button>
  )
}
