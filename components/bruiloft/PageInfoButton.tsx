'use client'

import * as React from 'react'
import { ChevronDown, Info } from 'lucide-react'

import { Modal } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'

export interface FaqItem {
  vraag: string
  antwoord: React.ReactNode
}

interface PageInfoButtonProps {
  // Titel van de uitlegmodal (meestal de paginanaam, bijv. "Budget").
  titel: string
  // Korte introductietekst die uitlegt waar de pagina voor dient.
  intro: React.ReactNode
  // FAQ-items, op volgorde van belangrijk naar minder belangrijk.
  faq: FaqItem[]
  // Toegankelijk label voor de knop zelf.
  ariaLabel?: string
}

// Ronde informatieknop die rechtsboven op een pagina hoort. Bij klikken
// opent een uitlegscherm met een korte introductie en een FAQ. Generiek
// opgezet zodat we hetzelfde patroon later op elke pagina kunnen hergebruiken.
export function PageInfoButton({
  titel,
  intro,
  faq,
  ariaLabel = 'Uitleg over deze pagina',
}: PageInfoButtonProps) {
  const [open, setOpen] = React.useState(false)
  // Eerste vraag staat standaard open zodat de gebruiker meteen ziet hoe het werkt.
  const [openIndex, setOpenIndex] = React.useState<number | null>(0)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        title={ariaLabel}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-rose-600 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Info className="h-5 w-5" aria-hidden />
      </button>

      <Modal open={open} onOpenChange={setOpen} title={titel}>
        <div className="space-y-5">
          {intro ? (
            <div className="text-sm leading-relaxed text-muted-foreground">{intro}</div>
          ) : null}

          <div className="space-y-2">
            {faq.map((item, i) => {
              const isOpen = openIndex === i
              return (
                <div key={i} className="overflow-hidden rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
                  >
                    <span>{item.vraag}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180'
                      )}
                      aria-hidden
                    />
                  </button>
                  {isOpen ? (
                    <div className="border-t border-border px-4 pb-4 pt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.antwoord}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </>
  )
}
