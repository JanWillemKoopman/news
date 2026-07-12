'use client'

import * as React from 'react'

import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { SafeImage } from '@/components/bruiloft/leveranciers/SafeImage'
import { cn } from '@/lib/utils'

interface CategorieAfbeeldingProps {
  categorie: string
  // Vul `afbeeldingUrl` in categorieConfig.ts in zodra de definitieve foto's
  // beschikbaar zijn — deze component schakelt dan vanzelf van de neutrale
  // icoon-placeholder naar de echte foto.
  afbeeldingUrl?: string
  className?: string
}

// Sfeervolle foto of neutrale placeholder (grijs vlak + categorie-icoon) voor
// de top-6-kaarten op /bruiloft/ontdekken — zelfde opzet als OntdekAfbeelding
// op de leveranciers zelf, zodat één beeldidioom door de hele directory loopt.
export function CategorieAfbeelding({ categorie, afbeeldingUrl, className }: CategorieAfbeeldingProps) {
  const [fotoMislukt, setFotoMislukt] = React.useState(false)
  const Icoon = getCategorieIcoon(categorie)
  const toonFoto = Boolean(afbeeldingUrl) && !fotoMislukt

  return (
    <div className={cn('relative w-full overflow-hidden bg-muted', className)}>
      {toonFoto ? (
        <SafeImage
          src={afbeeldingUrl as string}
          alt={categorie}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 50vw, 33vw"
          onError={() => setFotoMislukt(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icoon className="h-10 w-10 text-muted-foreground/40" aria-hidden />
        </div>
      )}
    </div>
  )
}
