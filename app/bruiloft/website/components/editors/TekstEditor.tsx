'use client'

import * as React from 'react'

import { Field, Input, Textarea } from '@/components/bruiloft/ui'
import type { WebsiteContentInput } from '@/lib/bruiloft/types'

import type { useDebounceOpslaan } from '../useDebounceOpslaan'

interface Props {
  veld: keyof WebsiteContentInput
  label: string
  waarde: string
  debounce: ReturnType<typeof useDebounceOpslaan<WebsiteContentInput>>
  meerdereRegels?: boolean
  placeholder?: string
  toelichting?: string
}

export function TekstEditor({ veld, label, waarde, debounce, meerdereRegels = true, placeholder, toelichting }: Props) {
  return (
    <div className="space-y-4">
      {toelichting && (
        <p className="text-sm text-muted-foreground">{toelichting}</p>
      )}
      <Field label={label} htmlFor={veld}>
        {meerdereRegels ? (
          <Textarea
            id={veld}
            value={waarde}
            onChange={(e) => debounce.stel({ [veld]: e.target.value } as Partial<WebsiteContentInput>)}
            rows={4}
            placeholder={placeholder}
          />
        ) : (
          <Input
            id={veld}
            value={waarde}
            onChange={(e) => debounce.stel({ [veld]: e.target.value } as Partial<WebsiteContentInput>)}
            placeholder={placeholder}
          />
        )}
      </Field>
    </div>
  )
}
