'use client'

import * as React from 'react'
import { LayoutList, Settings, BarChart2, Share2, Palette, Plus } from 'lucide-react'

import { canEdit } from '@/lib/bruiloft/permissions'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Skeleton } from '@/components/bruiloft/ui'
import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { cadeaulijstInfo } from '@/components/bruiloft/faqContent'
import { cn } from '@/lib/utils'
import type { RegistryItem } from '@/lib/bruiloft/types'
import { RegistryLijstbeheer } from './RegistryLijstbeheer'
import { RegistryOverzicht } from './RegistryOverzicht'
import { RegistryInstellingen } from './RegistryInstellingen'
import { RegistryVormgeving } from './RegistryVormgeving'
import { RegistryDeelModal } from './RegistryDeelModal'
import { RegistryItemForm } from './RegistryItemForm'

type Tab = 'lijst' | 'overzicht' | 'instellingen' | 'vormgeving'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'lijst', label: 'Mijn lijst', icon: <LayoutList className="h-4 w-4" /> },
  { id: 'overzicht', label: 'Reserveringen', icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'instellingen', label: 'Instellingen', icon: <Settings className="h-4 w-4" /> },
  { id: 'vormgeving', label: 'Uiterlijk', icon: <Palette className="h-4 w-4" /> },
]

export function CadeaulijstShell() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const permissions = useBruiloftStore((s) => s.permissions)
  const registryLoaded = useBruiloftStore((s) => s.registryLoaded)
  const loadRegistry = useBruiloftStore((s) => s.loadRegistry)

  const [activeTab, setActiveTab] = React.useState<Tab>('lijst')
  const [loading, setLoading] = React.useState(false)
  const [deelOpen, setDeelOpen] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<RegistryItem | null>(null)

  const openNieuw = () => {
    setEditItem(null)
    setFormOpen(true)
  }
  const openBewerk = (item: RegistryItem) => {
    setEditItem(item)
    setFormOpen(true)
  }

  React.useEffect(() => {
    if (wedding && !registryLoaded) {
      setLoading(true)
      loadRegistry().finally(() => setLoading(false))
    }
  }, [wedding, registryLoaded, loadRegistry])

  const isEditor = canEdit(permissions, 'registry')

  if (!wedding) return null

  if (loading && !registryLoaded) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Cadeaulijst"
        info={<PageInfoButton {...cadeaulijstInfo} />}
        actie={
          <>
            {isEditor && activeTab === 'lijst' && (
              <Button onClick={openNieuw}>
                <Plus className="h-4 w-4" /> Item toevoegen
              </Button>
            )}
            <Button variant="outline" onClick={() => setDeelOpen(true)}>
              <Share2 className="h-4 w-4" />
              Cadeaulijst delen
            </Button>
          </>
        }
        fab={
          isEditor && activeTab === 'lijst'
            ? { label: 'Item toevoegen', onClick: openNieuw }
            : undefined
        }
      />
      <RegistryDeelModal open={deelOpen} onOpenChange={setDeelOpen} />
      {isEditor && (
        <RegistryItemForm open={formOpen} onOpenChange={setFormOpen} initial={editItem} />
      )}

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'lijst' && (
        <RegistryLijstbeheer isEditor={isEditor} onNew={openNieuw} onEdit={openBewerk} />
      )}
      {activeTab === 'overzicht' && <RegistryOverzicht isEditor={isEditor} />}
      {activeTab === 'instellingen' && <RegistryInstellingen />}
      {activeTab === 'vormgeving' && <RegistryVormgeving />}
    </div>
  )
}
