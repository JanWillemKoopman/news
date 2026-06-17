'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Modal } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { isActive, visibleSections } from './nav'

interface MoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Bottom-sheet met alle secties (mobiel), geopend via "Meer" in de onderbalk.
// Toont per top-sectie de bijbehorende sub-items, zodat de mobiele gebruiker
// dezelfde structuur ziet als op desktop.
export function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  const pathname = usePathname()
  const permissions = useBruiloftStore((s) => s.permissions)
  const sections = visibleSections(permissions)
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Menu">
      <div className="flex flex-col gap-5 pb-2">
        {sections.map((section) => (
          <div key={section.key} className="flex flex-col gap-1">
            <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm transition-colors',
                    active
                      ? 'bg-rose-50 font-medium text-rose-700'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      active ? 'text-rose-600' : 'text-muted-foreground'
                    )}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </Modal>
  )
}
