'use client'

import * as React from 'react'

import { Button, EmptyState, Skeleton } from '@/components/bruiloft/ui'
import { ChevronDown, ChevronRight, ListChecks, Sparkles } from 'lucide-react'
import { TaskCard } from '@/components/bruiloft/taken/TaskCard'
import { QuickAddTask } from '@/components/bruiloft/taken/QuickAddTask'
import { AIInlineSuggestieCard } from '@/components/bruiloft/taken/AIInlineSuggestieCard'
import { DezeMaandSection } from '@/components/bruiloft/taken/views/DezeMaandSection'
import { TIJDSBLOK_VOLGORDE, addDays, toISODate } from '@/lib/bruiloft/timeblocks'
import type { ISODate, Task, Tijdsblok, Wedding, WeddingMember } from '@/lib/bruiloft/types'
import type { AITaakSuggestie } from '@/app/api/ai/taken/route'

const PRIO_ORDER: Record<string, number> = { hoog: 0, midden: 1, laag: 2 }

function deadlineVoorBlok(blok: Tijdsblok, trouwdatum: ISODate): ISODate {
  const offsetDagen: Record<Tijdsblok, number> = {
    '12 maanden voor': -340,
    '9 maanden voor': -270,
    '6 maanden voor': -180,
    '3 maanden voor': -90,
    '1 maand voor': -25,
    'laatste week': -7,
    trouwweek: -1,
    'na de bruiloft': 14,
  }
  return toISODate(addDays(trouwdatum, offsetDagen[blok]))
}

interface ListViewProps {
  tasks: Task[]
  allTasks: Task[]
  wedding: Wedding
  members: WeddingMember[]
  onToggleStatus: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
  onToggleSubtaak: (t: Task, id: string) => void
  onOpenForm: (deadline: ISODate) => void
  selectable: boolean
  isSelected: (id: string) => boolean
  onToggleSelect: (t: Task) => void
  achterstandRef?: React.MutableRefObject<HTMLDivElement | null>
  onResetFilters?: () => void
  // AI suggestions
  aiActive?: boolean
  aiSuggesties?: AITaakSuggestie[]
  aiLoading?: boolean
  aiError?: string | null
  onAiToevoegen?: (s: AITaakSuggestie) => Promise<void>
  onAiDismiss?: (titel: string) => void
}

export function ListView({
  tasks,
  allTasks,
  wedding,
  members,
  onToggleStatus,
  onEdit,
  onDelete,
  onToggleSubtaak,
  onOpenForm,
  selectable,
  isSelected,
  onToggleSelect,
  achterstandRef,
  onResetFilters,
  aiActive,
  aiSuggesties,
  aiLoading,
  aiError,
  onAiToevoegen,
  onAiDismiss,
}: ListViewProps) {
  // Handmatig open/dicht geklapte fasesecties (wint van de standaardkeuze).
  const [blokOverrides, setBlokOverrides] = React.useState<Partial<Record<Tijdsblok, boolean>>>({})

  if (allTasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        titel="Nog geen taken"
        beschrijving="Stel jullie takenlijst samen via de voorstellen hierboven, of voeg zelf een taak toe."
      />
    )
  }

  if (tasks.length === 0 && !aiActive) {
    return (
      <EmptyState
        icon={ListChecks}
        titel="Geen taken gevonden"
        beschrijving="Geen taken komen overeen met de huidige filters."
        actie={onResetFilters ? <Button variant="outline" size="sm" onClick={onResetFilters}>Wis filters</Button> : undefined}
      />
    )
  }

  let achterstallig: Tijdsblok | null = null
  for (const blok of TIJDSBLOK_VOLGORDE) {
    const heeftAchterstand = tasks.some(
      (t) => t.tijdsblok === blok && t.status !== 'klaar' && new Date(t.deadline) < new Date()
    )
    if (heeftAchterstand) {
      achterstallig = blok
      break
    }
  }

  // Fasesecties zijn inklapbaar: standaard staat alleen de eerstvolgende fase
  // met open taken uit (plus een fase met achterstand), zodat een volle lijst
  // — zoals de 71 starttaken — niet als muur binnenkomt. Een klik op de kop
  // klapt open/dicht; die keuze wint van de standaard.
  const eersteOpenBlok = TIJDSBLOK_VOLGORDE.find((blok) =>
    tasks.some((t) => t.tijdsblok === blok && t.status !== 'klaar')
  )
  const blokIsOpen = (blok: Tijdsblok): boolean =>
    blokOverrides[blok] ?? (blok === eersteOpenBlok || blok === achterstallig)

  return (
    <div className="space-y-8">
      {/* AI suggestions block */}
      {aiActive && (
        <AISuggestiesBlok
          suggesties={aiSuggesties}
          loading={aiLoading}
          error={aiError}
          onToevoegen={onAiToevoegen}
          onDismiss={onAiDismiss}
        />
      )}

      <DezeMaandSection
        tasks={tasks}
        members={members}
        onToggleStatus={onToggleStatus}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleSubtaak={onToggleSubtaak}
        selectable={selectable}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />

      {TIJDSBLOK_VOLGORDE.map((blok) => {
        const blokTaken = tasks
          .filter((t) => t.tijdsblok === blok)
          .sort((a, b) => a.deadline.localeCompare(b.deadline) || (PRIO_ORDER[a.prioriteit ?? ''] ?? 3) - (PRIO_ORDER[b.prioriteit ?? ''] ?? 3))
        if (blokTaken.length === 0) return null
        const open = blokIsOpen(blok)
        return (
          <div
            key={blok}
            ref={blok === achterstallig ? achterstandRef : undefined}
            data-blok={blok}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setBlokOverrides((prev) => ({ ...prev, [blok]: !open }))}
              className="mb-3 flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {open ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )}
              {blok}
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {blokTaken.length} {blokTaken.length === 1 ? 'taak' : 'taken'}
              </span>
            </button>
            {open ? (
              <div className="space-y-2">
                {blokTaken.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    members={members}
                    onToggleStatus={onToggleStatus}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleSubtaak={onToggleSubtaak}
                    selectable={selectable}
                    selected={isSelected(t.id)}
                    onToggleSelect={onToggleSelect}
                  />
                ))}
                <QuickAddTask
                  defaultDeadline={deadlineVoorBlok(blok, wedding.trouwdatum)}
                  onOpenForm={onOpenForm}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function AISuggestiesBlok({
  suggesties,
  loading,
  error,
  onToevoegen,
  onDismiss,
}: {
  suggesties?: AITaakSuggestie[]
  loading?: boolean
  error?: string | null
  onToevoegen?: (s: AITaakSuggestie) => Promise<void>
  onDismiss?: (titel: string) => void
}) {
  if (loading) {
    return (
      <div>
        <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-rose-600">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          Aanbevolen door AI
          <span className="text-muted-foreground normal-case tracking-normal font-normal">
            — AI denkt na…
          </span>
        </h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
        {error}
      </div>
    )
  }

  if (!suggesties || suggesties.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-rose-600">
        <Sparkles className="h-3.5 w-3.5" />
        Aanbevolen door AI
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{suggesties.length} suggesties</span>
      </h2>
      <div className="space-y-2">
        {suggesties.map((s) => (
          <AIInlineSuggestieCard
            key={s.titel}
            suggestie={s}
            onToevoegen={onToevoegen ?? (() => Promise.resolve())}
            onDismiss={onDismiss ?? (() => {})}
          />
        ))}
      </div>
    </div>
  )
}
