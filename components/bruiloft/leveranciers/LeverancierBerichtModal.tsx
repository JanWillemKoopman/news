'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'

import { Button, Field, Input, LoadingDots, Modal, Textarea, useToast } from '@/components/bruiloft/ui'
import { bouwContactTemplate, bouwOfferteTemplate } from '@/lib/bruiloft/suppliers/berichtTemplates'
import type { VendorContactType } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { SendVendorContactPayload } from '@/store/bruiloftStore'

interface LeverancierBerichtModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: VendorContactType
  vendor: SendVendorContactPayload['vendor']
  onSent?: () => void
}

// Compose-modal voor een offerte-/contactbericht aan een leverancier. Wordt
// zowel vanuit de ontdekken-kant (SupplierDetailModal) als vanuit "Mijn lijst"
// (VendorCard, opnieuw contact opnemen) aangeroepen — één implementatie.
export function LeverancierBerichtModal({
  open,
  onOpenChange,
  type,
  vendor,
  onSent,
}: LeverancierBerichtModalProps) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const sendVendorContact = useBruiloftStore((s) => s.sendVendorContact)
  const { toast } = useToast()

  const [onderwerp, setOnderwerp] = React.useState('')
  const [bericht, setBericht] = React.useState('')
  const [vraag, setVraag] = React.useState('')
  const [laadtConcept, setLaadtConcept] = React.useState(false)
  const [verbetertMetAI, setVerbetertMetAI] = React.useState(false)
  const [verzendt, setVerzendt] = React.useState(false)

  // Bij openen: "offerte" haalt altijd meteen een AI-concept op (met
  // sjabloon-fallback bij netwerkfout); "contact" vult instant het sjabloon in
  // — geen wachttijd, "Verbeter met AI" is optioneel.
  React.useEffect(() => {
    if (!open || !wedding) return
    setVraag('')

    const snapshot = { naam: vendor.naam, categorie: vendor.type }

    if (type === 'contact') {
      const concept = bouwContactTemplate(wedding, snapshot)
      setOnderwerp(concept.onderwerp)
      setBericht(concept.bericht)
      return
    }

    const fallback = bouwOfferteTemplate(wedding, snapshot)
    setOnderwerp(fallback.onderwerp)
    setBericht(fallback.bericht)
    setLaadtConcept(true)
    fetch('/api/ai/leverancier-bericht', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weddingId: wedding.id,
        type: 'offerte',
        vendor: { naam: vendor.naam, categorie: vendor.type },
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.onderwerp && data?.bericht) {
          setOnderwerp(data.onderwerp)
          setBericht(data.bericht)
        }
      })
      .catch(() => {
        // Sjabloon staat al ingevuld — niets te doen.
      })
      .finally(() => setLaadtConcept(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type])

  const verbeterMetAI = async () => {
    if (!wedding) return
    setVerbetertMetAI(true)
    try {
      const res = await fetch('/api/ai/leverancier-bericht', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId: wedding.id,
          type: 'contact',
          vendor: { naam: vendor.naam, categorie: vendor.type },
          vraag: bericht,
        }),
      })
      if (!res.ok) throw new Error('mislukt')
      const data = await res.json()
      if (data?.onderwerp && data?.bericht) {
        setOnderwerp(data.onderwerp)
        setBericht(data.bericht)
      } else {
        throw new Error('leeg')
      }
    } catch {
      toast({ title: 'Verbeteren mislukt', description: 'Probeer het opnieuw of pas de tekst zelf aan.', variant: 'error' })
    } finally {
      setVerbetertMetAI(false)
    }
  }

  const versturen = async () => {
    setVerzendt(true)
    try {
      await sendVendorContact({ type, onderwerp, bericht, vendor })
      toast({
        title: type === 'offerte' ? 'Offerte aangevraagd' : 'Bericht verzonden',
        variant: 'success',
      })
      onOpenChange(false)
      onSent?.()
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

  const titel = type === 'offerte' ? `Offerte aanvragen bij ${vendor.naam}` : `Contact opnemen met ${vendor.naam}`
  const kanVersturen = onderwerp.trim().length > 0 && bericht.trim().length > 0 && !verzendt

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={titel}
      description={vendor.email}
      className="sm:max-w-lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={verzendt}>
            Annuleren
          </Button>
          <Button onClick={versturen} loading={verzendt} disabled={!kanVersturen}>
            Versturen
          </Button>
        </div>
      }
    >
      {laadtConcept ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-6">
          <LoadingDots />
          <span className="text-sm text-muted-foreground">AI stelt een concept op basis van jullie profiel op…</span>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Onderwerp" htmlFor="lb-onderwerp">
            <Input id="lb-onderwerp" value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)} />
          </Field>
          <Field label="Bericht" htmlFor="lb-bericht">
            <Textarea
              id="lb-bericht"
              rows={10}
              value={bericht}
              onChange={(e) => setBericht(e.target.value)}
            />
          </Field>
          {type === 'contact' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={verbeterMetAI}
              loading={verbetertMetAI}
            >
              <Sparkles className="h-4 w-4" /> Verbeter met AI
            </Button>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
