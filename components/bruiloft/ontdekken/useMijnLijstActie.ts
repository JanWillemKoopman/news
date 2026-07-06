'use client'

import * as React from 'react'

import { useToast } from '@/components/bruiloft/ui'
import { VENDOR_TYPES } from '@/lib/bruiloft/options'
import { canEdit } from '@/lib/bruiloft/permissions'
import { isInMijnLijst, type OntdekBusiness } from '@/lib/bruiloft/discovery/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

// "Mijn lijst"-status en -actie voor één leverancier, los van welke pagina
// hem toont (kaart in de resultatengrid, of het tabblad-detailpaneel — dat
// laatste blijft ook open staan terwijl de gebruiker van categoriepagina
// wisselt, dus deze hook mag niet afhangen van een specifieke pagina-state).
export function useMijnLijstActie(business: OntdekBusiness) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const addVendor = useBruiloftStore((s) => s.addVendor)
  const updateWedding = useBruiloftStore((s) => s.updateWedding)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'leveranciers')
  const toegevoegd = isInMijnLijst(business, vendors)

  const voegToe = React.useCallback(async () => {
    if (!wedding || toegevoegd) return
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
      toast({ title: 'Toegevoegd aan Mijn lijst', variant: 'success' })
    } catch {
      toast({ title: 'Toevoegen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }, [wedding, business, toegevoegd, addVendor, updateWedding, toast])

  return { kanBewerken, toegevoegd, voegToe }
}
