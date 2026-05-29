'use client'

import * as React from 'react'

import { Field, Textarea } from '@/components/bruiloft/ui'
import type { WebsiteContentInput } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { FotoUpload } from '../FotoUpload'
import type { useDebounceOpslaan } from '../useDebounceOpslaan'

interface Props {
  welkomsttekst: string
  headerFotoUrl: string
  debounce: ReturnType<typeof useDebounceOpslaan<WebsiteContentInput>>
}

export function HomeEditor({ welkomsttekst, headerFotoUrl, debounce }: Props) {
  const uploadHeaderFoto = useBruiloftStore((s) => s.uploadHeaderFoto)
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 font-medium text-foreground">Headerfoto</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          De grote foto die bovenaan jullie trouwwebsite staat.
        </p>
        <FotoUpload
          huidigUrl={headerFotoUrl}
          onUpload={(file) => uploadHeaderFoto(file).then(() => undefined)}
          onVerwijder={() => saveWebsiteContent({ headerFotoUrl: '' })}
          aanbevolenAfmeting="Aanbevolen: 2400×1600px"
        />
      </div>
      <Field label="Welkomsttekst" htmlFor="welkom">
        <Textarea
          id="welkom"
          value={welkomsttekst}
          onChange={(e) => debounce.stel({ welkomsttekst: e.target.value })}
          rows={4}
          placeholder="Schrijf een persoonlijk welkomstbericht voor jullie gasten…"
        />
      </Field>
    </div>
  )
}
