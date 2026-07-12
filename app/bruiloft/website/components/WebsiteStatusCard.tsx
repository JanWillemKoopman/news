'use client'

import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import type { WebsiteContent } from '@/lib/bruiloft/types'

import { useSlugBewerker } from './useSlugBewerker'

interface Props {
  content: WebsiteContent
  onTogglePublicatie: () => void
  publiekeUrl: string | null
}

export function WebsiteStatusCard({ content, onTogglePublicatie, publiekeUrl }: Props) {
  const [gekopieerd, setGekopieerd] = React.useState(false)
  const { slug, slugStatus, onSlugWijziging, slugFeedback, herkomst } = useSlugBewerker(content)

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

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-4 sm:p-5">
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
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
                content.websiteGepubliceerd ? 'left-6' : 'left-1'
              )}
            />
          </button>
          <div>
            <span className="text-sm font-semibold text-foreground">
              {content.websiteGepubliceerd ? 'Website is live' : 'Website is verborgen'}
            </span>
            <p className="text-xs text-muted-foreground">
              {content.websiteGepubliceerd
                ? 'Jullie gasten kunnen de website bekijken.'
                : 'Alleen zichtbaar voor beheerders.'}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2',
            slugStatus === 'leeg' || slugStatus === 'bezet' || slugStatus === 'ongeldig'
              ? 'border-destructive'
              : 'border-border'
          )}
        >
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {herkomst.replace(/^https?:\/\//, '')}/trouwen/
          </span>
          <input
            value={slug}
            onChange={onSlugWijziging}
            placeholder="jullie-namen"
            className="min-w-0 flex-1 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          {slugStatus === 'checking' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
          {slugStatus === 'beschikbaar' && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
          {publiekeUrl && (
            <>
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
            </>
          )}
        </div>
        {slugFeedback && (
          <p
            className={cn(
              'mt-1.5 text-xs',
              slugStatus === 'bezet' || slugStatus === 'ongeldig' || slugStatus === 'leeg'
                ? 'text-destructive'
                : 'text-muted-foreground'
            )}
          >
            {slugFeedback}
          </p>
        )}
      </div>
    </div>
  )
}
