'use client'

import * as React from 'react'

import { Button, Textarea, useToast } from '@/components/bruiloft/ui'

interface ReplyComposerProps {
  onSend: (tekst: string) => Promise<void>
}

// Reactie binnen een bestaand leveranciersgesprek: verstuurt een e-mail naar
// de leverancier (zelfde reageer-link als het openingsbericht) en voegt het
// bericht direct toe aan de thread hierboven.
export function ReplyComposer({ onSend }: ReplyComposerProps) {
  const [tekst, setTekst] = React.useState('')
  const [verzendt, setVerzendt] = React.useState(false)
  const { toast } = useToast()

  const versturen = async () => {
    const waarde = tekst.trim()
    if (!waarde || verzendt) return
    setVerzendt(true)
    try {
      await onSend(waarde)
      setTekst('')
      toast({ title: 'Bericht verzonden', variant: 'success' })
    } catch (err) {
      toast({
        title: 'Versturen mislukt',
        description: err instanceof Error ? err.message : 'Probeer het opnieuw.',
        variant: 'error',
      })
    } finally {
      setVerzendt(false)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        placeholder="Schrijf een reactie…"
        aria-label="Reactie"
      />
      <div className="flex justify-end">
        <Button onClick={versturen} loading={verzendt} disabled={!tekst.trim()}>
          Reageren
        </Button>
      </div>
    </div>
  )
}
