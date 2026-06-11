'use client'

import * as React from 'react'
import { Globe, Link2, Mail, Pencil, Phone, Trash2, User } from 'lucide-react'

import { Card, CardContent, Money, OverflowMenu, StatusBadge } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type { BudgetItem, Vendor, VendorStatus } from '@/lib/bruiloft/types'

// Statuskleur als accentrand links, in lijn met de StatusBadge-tonen.
const STATUS_ACCENT: Record<VendorStatus, string> = {
  'te bezoeken': 'border-l-sky-400',
  bezocht: 'border-l-stone-300 dark:border-l-stone-600',
  'offerte aangevraagd': 'border-l-amber-400',
  geboekt: 'border-l-emerald-500',
  afgewezen: 'border-l-rose-400',
}

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

interface VendorCardProps {
  vendor: Vendor
  budgetItems: BudgetItem[]
  onEdit?: (v: Vendor) => void
  onDelete?: (v: Vendor) => void
}

// Kaart in de persoonlijke lijst: status voorop, contact als snelle acties.
export function VendorCard({ vendor, budgetItems, onEdit, onDelete }: VendorCardProps) {
  const gekoppeld = vendor.budgetItemId
    ? budgetItems.find((b) => b.id === vendor.budgetItemId)
    : null
  const voedtBudget = vendor.status === 'geboekt' && gekoppeld

  const menuItems = [
    ...(onEdit ? [{ label: 'Bewerken', icon: Pencil, onClick: () => onEdit(vendor) }] : []),
    ...(onDelete
      ? [{ label: 'Verwijderen', icon: Trash2, danger: true, onClick: () => onDelete(vendor) }]
      : []),
  ]

  const klikbaar = Boolean(onEdit)

  const contactActies = [
    vendor.telefoon
      ? { label: `Bel ${vendor.naam}`, href: `tel:${vendor.telefoon}`, icoon: Phone }
      : null,
    vendor.email
      ? { label: `E-mail ${vendor.naam}`, href: `mailto:${vendor.email}`, icoon: Mail }
      : null,
    vendor.website
      ? { label: `Website van ${vendor.naam}`, href: websiteHref(vendor.website), icoon: Globe, extern: true }
      : null,
  ].filter(Boolean) as { label: string; href: string; icoon: typeof Phone; extern?: boolean }[]

  return (
    <Card
      role={klikbaar ? 'button' : undefined}
      tabIndex={klikbaar ? 0 : undefined}
      aria-label={klikbaar ? `Bewerk ${vendor.naam}` : undefined}
      onClick={klikbaar ? () => onEdit!(vendor) : undefined}
      onKeyDown={
        klikbaar
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEdit!(vendor)
              }
            }
          : undefined
      }
      interactive={klikbaar}
      className={cn(
        'flex flex-col border-l-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        STATUS_ACCENT[vendor.status]
      )}
    >
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{vendor.naam}</p>
            <p className="text-xs capitalize text-muted-foreground">{vendor.type}</p>
          </div>
          {menuItems.length > 0 ? (
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
              <OverflowMenu items={menuItems} label={`Acties voor ${vendor.naam}`} />
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <StatusBadge kind="leverancier" value={vendor.status} />
          {vendor.geoffreerdBedrag > 0 ? (
            <span className="text-sm font-semibold text-foreground">
              <Money bedrag={vendor.geoffreerdBedrag} />
            </span>
          ) : null}
        </div>

        {(contactActies.length > 0 || vendor.contactpersoon) && (
          <div className="mt-3 flex items-center gap-2">
            {contactActies.map((a) => (
              <a
                key={a.label}
                href={a.href}
                aria-label={a.label}
                title={a.label}
                target={a.extern ? '_blank' : undefined}
                rel={a.extern ? 'noopener noreferrer' : undefined}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <a.icoon className="h-4 w-4" />
              </a>
            ))}
            {vendor.contactpersoon ? (
              <span className="ml-1 inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{vendor.contactpersoon}</span>
              </span>
            ) : null}
          </div>
        )}

        {gekoppeld ? (
          <p className="mt-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Link2 className="h-3 w-3" />
              {voedtBudget ? 'telt mee in budget' : 'budget'}:{' '}
              <span className="capitalize">{gekoppeld.omschrijving || gekoppeld.categorie}</span>
            </span>
          </p>
        ) : null}

        {vendor.notitie ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{vendor.notitie}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
