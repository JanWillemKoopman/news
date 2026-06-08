'use client'

import { Check, Copy, ExternalLink, Globe } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import type { WebsiteContent } from '@/lib/bruiloft/types'

const TOTAAL_SECTIES = 10

interface Props {
  content: WebsiteContent
  onTogglePublicatie: () => void
  publiekeUrl: string | null
}

export function WebsiteStatusCard({ content, onTogglePublicatie, publiekeUrl }: Props) {
  const [gekopieerd, setGekopieerd] = React.useState(false)

  async function kopieerUrl() {
    if (!publiekeUrl) return
    try {
      await navigator.clipboard.writeText(publiekeUrl)
      setGekopieerd(true)
      setTimeout(() => setGekopieerd(false), 1500)
    } catch {
      // klembord niet beschikbaar
    }
  }

  const verborgenCount = Object.values(content.sectiesConfig).filter(
    (s) => s.zichtbaar === false
  ).length
  const actieveCount = TOTAAL_SECTIES - verborgenCount

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col sm:flex-row">
        {/* Left: publish toggle + URL */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="mb-3.5 flex items-center gap-3">
            <button
              role="switch"
              aria-checked={content.websiteGepubliceerd}
              onClick={onTogglePublicatie}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                content.websiteGepubliceerd ? 'bg-primary' : 'bg-input'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  content.websiteGepubliceerd ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {content.websiteGepubliceerd ? 'Website is live' : 'Website is verborgen'}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    content.websiteGepubliceerd
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-muted text-muted-foreground ring-1 ring-border'
                  )}
                >
                  {content.websiteGepubliceerd && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                  {content.websiteGepubliceerd ? 'Live' : 'Concept'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {content.websiteGepubliceerd
                  ? 'Jullie gasten kunnen de website bekijken.'
                  : 'Alleen zichtbaar voor beheerders.'}
              </p>
            </div>
          </div>

          {publiekeUrl ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {publiekeUrl.replace(/^https?:\/\//, '')}
              </span>
              <button
                onClick={kopieerUrl}
                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                title="Kopieer URL"
              >
                {gekopieerd ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <a
                href={publiekeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                title="Bekijk website"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              Stel een website-adres in bij Ontwerp-instellingen hieronder.
            </p>
          )}
        </div>

        {/* Right: stats */}
        <div className="flex items-center gap-6 border-t border-border px-4 py-3.5 sm:border-l sm:border-t-0 sm:px-6 sm:py-5">
          <div className="text-center">
            <p className="text-2xl font-semibold tabular-nums text-foreground">{actieveCount}</p>
            <p className="text-xs text-muted-foreground">actieve secties</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-semibold tabular-nums text-muted-foreground">{verborgenCount}</p>
            <p className="text-xs text-muted-foreground">verborgen</p>
          </div>
        </div>
      </div>
    </div>
  )
}
