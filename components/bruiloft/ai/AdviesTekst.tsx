'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

// Lange AI-teksten standaard ingeklapt op twee regels, met "Lees meer".
// Houdt advieskaarten compact, vooral op mobiel.
const LANG_VANAF = 160

export function AdviesTekst({ tekst, className }: { tekst: string; className?: string }) {
  const [uitgeklapt, setUitgeklapt] = React.useState(false)
  const isLang = tekst.length > LANG_VANAF

  return (
    <>
      <p className={cn(className, isLang && !uitgeklapt && 'line-clamp-2')}>{tekst}</p>
      {isLang ? (
        <button
          type="button"
          onClick={() => setUitgeklapt((v) => !v)}
          className="mt-0.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          {uitgeklapt ? 'Toon minder' : 'Lees meer'}
        </button>
      ) : null}
    </>
  )
}
