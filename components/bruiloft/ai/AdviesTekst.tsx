'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

export function AdviesTekst({ tekst, className }: { tekst: string; className?: string }) {
  const [uitgeklapt, setUitgeklapt] = React.useState(false)
  const [isAfgekapt, setIsAfgekapt] = React.useState(false)
  const ref = React.useRef<HTMLParagraphElement>(null)

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Detect whether line-clamp-2 actually cuts off content
    setIsAfgekapt(el.scrollHeight > el.clientHeight)
  }, [tekst])

  return (
    <>
      <p
        ref={ref}
        className={cn(className, !uitgeklapt && 'line-clamp-2')}
      >
        {tekst}
      </p>
      {isAfgekapt ? (
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
