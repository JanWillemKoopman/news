'use client'

import * as React from 'react'

import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { SafeImage } from '@/components/bruiloft/leveranciers/SafeImage'
import { cn } from '@/lib/utils'
import type { OntdekBusiness } from '@/lib/bruiloft/discovery/types'

interface OntdekAfbeeldingProps {
  business: OntdekBusiness
  className?: string
  // Overlay-elementen (bv. het hartje) — absoluut gepositioneerd t.o.v. deze
  // container, zodat kaart én detailpaneel hetzelfde beeldvlak hergebruiken.
  children?: React.ReactNode
}

// Foto of neutrale placeholder (grijs vlak + categorie-icoon in het midden).
// Nu nog vrijwel altijd de placeholder-tak (de dataset heeft pas bij een
// klein deel van de leveranciers een foto) — zodra header_image gevuld is,
// schakelt dit vanzelf om. Bij een kapotte URL valt hij terug op dezelfde
// placeholder i.p.v. een leeg gat.
export function OntdekAfbeelding({ business, className, children }: OntdekAfbeeldingProps) {
  const [fotoMislukt, setFotoMislukt] = React.useState(false)
  React.useEffect(() => setFotoMislukt(false), [business.afbeeldingUrl])

  const Icoon = getCategorieIcoon(business.categorie)
  const toonFoto = Boolean(business.afbeeldingUrl) && !fotoMislukt

  return (
    <div className={cn('relative w-full overflow-hidden bg-muted', className)}>
      {toonFoto ? (
        <SafeImage
          src={business.afbeeldingUrl}
          alt={business.naam}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
          onError={() => setFotoMislukt(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icoon className="h-9 w-9 text-muted-foreground/40" aria-hidden />
        </div>
      )}
      {children}
    </div>
  )
}
