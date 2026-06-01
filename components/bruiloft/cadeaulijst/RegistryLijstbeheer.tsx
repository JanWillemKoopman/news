'use client'

import * as React from 'react'
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Gift,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  PiggyBank,
} from 'lucide-react'

import { formatEuro } from '@/lib/bruiloft/format'
import { useBruiloftStore } from '@/store/bruiloftStore'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  useToast,
} from '@/components/bruiloft/ui'
import { Progress } from '@/components/ui/progress'
import type { RegistryItem } from '@/lib/bruiloft/types'
import { RegistryItemForm } from './RegistryItemForm'

interface Props {
  isEditor: boolean
}

export function RegistryLijstbeheer({ isEditor }: Props) {
  const registryItems = useBruiloftStore((s) => s.registryItems)
  const registryReservations = useBruiloftStore((s) => s.registryReservations)
  const registryContributions = useBruiloftStore((s) => s.registryContributions)
  const deleteRegistryItem = useBruiloftStore((s) => s.deleteRegistryItem)
  const reorderRegistryItems = useBruiloftStore((s) => s.reorderRegistryItems)
  const { toast } = useToast()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<RegistryItem | null>(null)
  const [deleteItem, setDeleteItem] = React.useState<RegistryItem | null>(null)

  const sortedItems = [...registryItems].sort((a, b) => a.sortOrder - b.sortOrder)

  const openNew = () => {
    setEditItem(null)
    setFormOpen(true)
  }

  const openEdit = (item: RegistryItem) => {
    setEditItem(item)
    setFormOpen(true)
  }

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const items = [...sortedItems]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return
    const temp = items[index]
    items[index] = items[newIndex]
    items[newIndex] = temp
    try {
      await reorderRegistryItems(items.map((i) => i.id))
    } catch {
      toast({ title: 'Volgorde bijwerken mislukt', variant: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await deleteRegistryItem(deleteItem.id)
      toast({ title: 'Item verwijderd', variant: 'success' })
    } catch {
      toast({ title: 'Verwijderen mislukt', variant: 'error' })
    }
  }

  const getItemReservation = (itemId: string) =>
    registryReservations.find((r) => r.itemId === itemId)

  const getItemContributions = (itemId: string) => {
    const contribs = registryContributions.filter((c) => c.itemId === itemId)
    const confirmed = contribs.filter((c) => c.paymentStatus === 'confirmed').reduce((s, c) => s + c.amount, 0)
    const pending = contribs.filter((c) => c.paymentStatus === 'pending').reduce((s, c) => s + c.amount, 0)
    return { confirmed, pending, count: contribs.filter((c) => c.paymentStatus !== 'cancelled').length }
  }

  return (
    <div>
      {isEditor && (
        <div className="mb-4 flex justify-end">
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Item toevoegen
          </Button>
        </div>
      )}

      {sortedItems.length === 0 ? (
        <EmptyState
          icon={Gift}
          titel="Nog geen items"
          beschrijving="Voeg een cadeauwens of geldfonds toe aan jullie lijst."
          actie={
            isEditor ? (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Item toevoegen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedItems.map((item, index) => (
            <RegistryItemCard
              key={item.id}
              item={item}
              index={index}
              total={sortedItems.length}
              reservation={getItemReservation(item.id)}
              contributions={getItemContributions(item.id)}
              isEditor={isEditor}
              onEdit={() => openEdit(item)}
              onDelete={() => setDeleteItem(item)}
              onMoveUp={() => moveItem(index, 'up')}
              onMoveDown={() => moveItem(index, 'down')}
            />
          ))}
        </div>
      )}

      {isEditor && (
        <>
          <RegistryItemForm
            open={formOpen}
            onOpenChange={setFormOpen}
            initial={editItem}
          />
          <ConfirmDialog
            open={deleteItem !== null}
            onOpenChange={(o) => !o && setDeleteItem(null)}
            title="Item verwijderen?"
            description={
              deleteItem
                ? `Weet je zeker dat je "${deleteItem.title}" wilt verwijderen? Reserveringen en bijdragen worden ook verwijderd.`
                : undefined
            }
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  )
}

interface CardProps {
  item: RegistryItem
  index: number
  total: number
  reservation: { guestName: string } | undefined
  contributions: { confirmed: number; pending: number; count: number }
  isEditor: boolean
  onEdit: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function RegistryItemCard({ item, index, total, reservation, contributions, isEditor, onEdit, onDelete, onMoveUp, onMoveDown }: CardProps) {
  const isGift = item.type === 'gift'
  const isReserved = !!reservation
  const targetCents = item.targetAmount ?? 0
  const progressPct = targetCents > 0 ? Math.min(100, (contributions.confirmed / targetCents) * 100) : 0

  return (
    <Card className="flex flex-col overflow-hidden">
      {item.imageUrl ? (
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center bg-muted/40">
          {isGift ? (
            <ShoppingBag className="h-10 w-10 text-muted-foreground/40" />
          ) : (
            <PiggyBank className="h-10 w-10 text-muted-foreground/40" />
          )}
        </div>
      )}

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-2">{item.title}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${isGift ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {isGift ? 'Cadeau' : 'Geldfonds'}
          </span>
        </div>

        {item.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        )}

        {isGift ? (
          <div className="mt-auto flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isReserved ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {isReserved ? '✓ Gereserveerd' : 'Beschikbaar'}
            </span>
            {item.shopUrl && (
              <a href={item.shopUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline">
                <ExternalLink className="h-3 w-3" /> Webshop
              </a>
            )}
          </div>
        ) : (
          <div className="mt-auto space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatEuro(contributions.confirmed / 100, { cents: true })} bevestigd</span>
              {targetCents > 0 && <span>van {formatEuro(targetCents / 100, { cents: true })}</span>}
            </div>
            {targetCents > 0 && <Progress value={progressPct} className="h-1.5" />}
            {contributions.pending > 0 && (
              <p className="text-xs text-amber-600">{formatEuro(contributions.pending / 100, { cents: true })} in behandeling</p>
            )}
            <p className="text-xs text-muted-foreground">{contributions.count} bijdrage{contributions.count !== 1 ? 's' : ''}</p>
          </div>
        )}
      </CardContent>

      {isEditor && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <div className="flex gap-1">
            <button onClick={onMoveUp} disabled={index === 0} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Omhoog">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button onClick={onMoveDown} disabled={index === total - 1} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Omlaag">
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Bewerken">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="rounded p-1 text-muted-foreground hover:text-rose-600" aria-label="Verwijderen">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
