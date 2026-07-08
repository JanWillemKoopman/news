'use client'

import * as React from 'react'

import { Button, Field, Input, Modal, Textarea, useToast } from '@/components/bruiloft/ui'
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
// zowel vanuit de ontdekken-kant (SupplierDetailModal) als vanuit "Mijn
// leveranciers" (opnieuw contact opnemen) aangeroepen — één implementatie.
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
  const [verzendt, setVerzendt] = React.useState(false)

  // Bij openen: sjabloon direct invullen — geen wachttijd.
  React.useEffect(() => {
    if (!open || !wedding) return

    const snapshot = { naam: vendor.naam, categorie: vendor.type }
    const concept = type === 'contact'
      ? bouwContactTemplate(wedding, snapshot)
      : bouwOfferteTemplate(wedding, snapshot)
    setOnderwerp(concept.onderwerp)
    setBericht(concept.bericht)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type])

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
      </div>
    </Modal>
  )
}
