'use client'

import * as React from 'react'

import { LeverancierBerichtModal } from '@/components/bruiloft/leveranciers/LeverancierBerichtModal'
import { useToast } from '@/components/bruiloft/ui'
import { VENDOR_TYPES } from '@/lib/bruiloft/options'
import { canEdit } from '@/lib/bruiloft/permissions'
import { isInMijnLijst, type OntdekBusiness } from '@/lib/bruiloft/discovery/types'
import type { VendorContactType } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

// "Mijn lijst"-status en -actie voor één leverancier, los van welke pagina
// hem toont (kaart in de resultatengrid, of de detailpagina) — dus geen
// prop-drilling van addVendor/toast-logica per pagina.
//
// Beheert ook de offerte/contact-modal zelf (i.p.v. dat elke aanroeper zijn
// eigen berichtType-state bijhoudt), zodat de bevestigingstoast na het
// toevoegen direct kan doorschakelen naar "Offerte aanvragen" — de brug
// tussen ontdekken en administratief afhandelen zit zo op één plek.
export function useMijnLijstActie(business: OntdekBusiness) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const addVendor = useBruiloftStore((s) => s.addVendor)
  const updateWedding = useBruiloftStore((s) => s.updateWedding)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()
  const [berichtType, setBerichtType] = React.useState<VendorContactType | null>(null)
  // Ref i.p.v. state: puur een re-entry-guard, hoeft geen re-render te
  // veroorzaken — voorkomt dat een razendsnelle dubbele klik addVendor
  // tweemaal afvuurt voordat de eerste call is verwerkt.
  const bezigRef = React.useRef(false)

  const kanBewerken = canEdit(permissions, 'leveranciers')
  const toegevoegd = isInMijnLijst(business, vendors)
  const heeftEmail = Boolean(business.email)

  const voegToe = React.useCallback(async () => {
    if (!wedding || toegevoegd || bezigRef.current) return
    bezigRef.current = true
    const b = business
    const adres = [b.straat, [b.postcode, b.plaats].filter(Boolean).join(' ')]
      .filter((deel) => deel && deel.trim().length > 0)
      .join(', ')
    try {
      await addVendor({
        naam: b.naam,
        type: b.categorie,
        status: 'te bezoeken',
        contactpersoon: '',
        telefoon: b.telefoon,
        email: b.email,
        website: b.website,
        geoffreerdBedrag: 0,
        notitie: b.beschrijving.length > 280 ? `${b.beschrijving.slice(0, 277)}…` : b.beschrijving,
        adres,
        latitude: b.lat,
        longitude: b.lon,
        tpwBusinessId: b.id,
      })
      // Zorg dat de categorie in de beheerde lijst staat, anders valt deze
      // leverancier op /bruiloft/leveranciers terug op "Overig".
      const categorieen = wedding.vendorCategorieen?.length ? wedding.vendorCategorieen : VENDOR_TYPES
      if (!categorieen.includes(b.categorie)) {
        await updateWedding({ vendorCategorieen: [...categorieen, b.categorie] }).catch(() => {})
      }
      toast({
        title: 'Toegevoegd aan Mijn lijst',
        variant: 'success',
        // Directe vervolgstap naar het administratieve deel van de funnel —
        // alleen aanbieden als een offerte ook echt verstuurd kan worden.
        action: heeftEmail ? { label: 'Offerte aanvragen', onClick: () => setBerichtType('offerte') } : undefined,
      })
    } catch {
      toast({ title: 'Toevoegen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      bezigRef.current = false
    }
  }, [wedding, business, toegevoegd, heeftEmail, addVendor, updateWedding, toast])

  const berichtModal = berichtType ? (
    <LeverancierBerichtModal
      open
      onOpenChange={(o) => !o && setBerichtType(null)}
      type={berichtType}
      vendor={{
        tpwBusinessId: business.id,
        naam: business.naam,
        type: business.categorie,
        email: business.email,
        telefoon: business.telefoon,
        website: business.website,
      }}
      onSent={() => setBerichtType(null)}
    />
  ) : null

  return { kanBewerken, toegevoegd, voegToe, openBericht: setBerichtType, berichtModal }
}
