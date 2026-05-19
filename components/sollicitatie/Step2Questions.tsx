'use client'

import { ArrowLeft, ArrowRight, SlidersHorizontal, Target } from 'lucide-react'
import { useCoverLetterStore } from '@/store/coverLetterStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function Step2Questions() {
  const { analysis, answers, extraInstructions, setAnswer, setExtraInstructions, setStep } =
    useCoverLetterStore()

  if (!analysis) return null

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
