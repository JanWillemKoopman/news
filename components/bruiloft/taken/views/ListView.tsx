'use client'

import * as React from 'react'

import { Button, EmptyState, Skeleton } from '@/components/bruiloft/ui'
import { ChevronDown, ChevronRight, EyeOff, ListChecks, Sparkles } from 'lucide-react'
import { TaskCard } from '@/components/bruiloft/taken/TaskCard'
import { QuickAddTask } from '@/components/bruiloft/taken/QuickAddTask'
import { AIInlineSuggestieCard } from '@/components/bruiloft/taken/AIInlineSuggestieCard'
import { DezeMaandSection } from '@/components/bruiloft/taken/views/DezeMaandSection'
import { effectievePrioriteit } from '@/lib/bruiloft/taken/stats'
import { defaultDeadlineVoorMaand, groepeerOpDeadlineMaand } from '@/lib/bruiloft/taken/timeline'
import { cn } from '@/lib/utils'
import type { ISODate, Task, Wedding, WeddingMember } from '@/lib/bruiloft/types'
import type { AITaakSuggestie } from '@/app/api/ai/taken/route'

const PRIO_ORDER: Record<string, number> = { hoog: 0, midden: 1, laag: 2 }

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
  onResetFilters?: () => void
  // AI suggestions
  aiActive?: boolean
  aiSuggesties?: AITaakSuggestie[]
  aiLoading?: boolean
  aiError?: string | null
  aiNextAvailable?: Date | null
  aiAantalWeggeklikt?: number
  onAiToevoegen?: (s: AITaakSuggestie) => Promise<void>
  onAiDismiss?: (titel: string) => void
  onAiToonWeggeklikt?: () => void
  onAiHide?: () => void
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
  onResetFilters,
  aiActive,
  aiSuggesties,
  aiLoading,
  aiError,
  aiNextAvailable,
  aiAantalWeggeklikt,
  onAiToevoegen,
  onAiDismiss,
  onAiToonWeggeklikt,
  onAiHide,
}: ListViewProps) {
  // Handmatig open/dicht geklapte maandsecties (wint van de standaardkeuze).
  const [maandOverrides, setMaandOverrides] = React.useState<Record<string, boolean>>({})
  const maandGroepen = React.useMemo(() => groepeerOpDeadlineMaand(tasks), [tasks])

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

  // Maandsecties zijn inklapbaar, maar staan standaard allemaal open zodat
  // alle kaartjes direct zichtbaar zijn. Een klik op de kop klapt dicht; die
  // keuze wint van de standaard.
  const maandIsOpen = (key: string): boolean => maandOverrides[key] ?? true

  return (
    <div className="space-y-8">
      {/* AI suggestions block */}
      {aiActive && (
        <AISuggestiesBlok
          suggesties={aiSuggesties}
          loading={aiLoading}
          error={aiError}
          nextAvailable={aiNextAvailable}
          aantalWeggeklikt={aiAantalWeggeklikt}
          onToevoegen={onAiToevoegen}
          onDismiss={onAiDismiss}
          onToonWeggeklikt={onAiToonWeggeklikt}
          onHide={onAiHide}
        />
      )}

      <DezeMaandSection
        tasks={tasks}
        members={members}
        partner1Naam={wedding.partner1Naam}
        partner2Naam={wedding.partner2Naam}
        onToggleStatus={onToggleStatus}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleSubtaak={onToggleSubtaak}
        selectable={selectable}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />

      {maandGroepen.length > 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          Hieronder per maand de taken met een deadline — de uiterlijke datum waarop het geregeld
          moet zijn.
        </p>
      ) : null}

      {maandGroepen.map((groep) => {
        const groepTaken = [...groep.tasks].sort(
          (a, b) =>
            a.deadline.localeCompare(b.deadline) ||
            PRIO_ORDER[effectievePrioriteit(a)] - PRIO_ORDER[effectievePrioriteit(b)]
        )
        const open = maandIsOpen(groep.key)
        return (
          <div key={groep.key} className="border-l-2 border-border pl-4">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setMaandOverrides((prev) => ({ ...prev, [groep.key]: !open }))}
              className="mb-3 -ml-4 flex w-full items-center gap-2 rounded-md py-1.5 pl-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {open ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )}
              {groep.label}
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {groepTaken.length} {groepTaken.length === 1 ? 'taak' : 'taken'}
              </span>
            </button>
            {open ? (
              <div className="space-y-2">
                {groepTaken.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    members={members}
                    partner1Naam={wedding.partner1Naam}
                    partner2Naam={wedding.partner2Naam}
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
                  defaultDeadline={defaultDeadlineVoorMaand(groep.key)}
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
  nextAvailable,
  aantalWeggeklikt,
  onToevoegen,
  onDismiss,
  onToonWeggeklikt,
  onHide,
}: {
  suggesties?: AITaakSuggestie[]
  loading?: boolean
  error?: string | null
  nextAvailable?: Date | null
  aantalWeggeklikt?: number
  onToevoegen?: (s: AITaakSuggestie) => Promise<void>
  onDismiss?: (titel: string) => void
  onToonWeggeklikt?: () => void
  onHide?: () => void
}) {
  const wachtMinuten =
    nextAvailable && nextAvailable.getTime() > Date.now()
      ? Math.ceil((nextAvailable.getTime() - Date.now()) / 60000)
      : null
  // De kop met "Verberg voorgestelde taken" staat er in élke toestand (laden,
  // fout, leeg, resultaten) zodat er altijd een uitweg is zolang de
  // voorgestelde-taken-modus aanstaat.
  const header = (subtitel: React.ReactNode) => (
    <div className="mb-3 flex items-center justify-between gap-3 px-1">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-600">
        <Sparkles className={cn('h-3.5 w-3.5', loading && 'animate-pulse')} />
        Aanbevolen door de AI-assistent
        {subtitel}
      </h2>
      {onHide ? (
        <button
          type="button"
          onClick={onHide}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Verberg voorgestelde taken
        </button>
      ) : null}
    </div>
  )

  if (loading) {
    return (
      <div>
        {header(
          <span className="text-muted-foreground normal-case tracking-normal font-normal">
            — De AI-assistent genereert suggesties…
          </span>
        )}
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
      <div>
        {header(null)}
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
          {error}
        </div>
      </div>
    )
  }

  if (!suggesties || suggesties.length === 0) {
    return (
      <div>
        {header(null)}
        <p className="px-1 text-sm text-muted-foreground">
          {aantalWeggeklikt && aantalWeggeklikt > 0
            ? `Alle ${aantalWeggeklikt} suggesties zijn weggeklikt.`
            : 'Geen suggesties meer.'}
        </p>
        {aantalWeggeklikt && aantalWeggeklikt > 0 && onToonWeggeklikt ? (
          <button
            type="button"
            onClick={onToonWeggeklikt}
            className="mt-1 px-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Weggeklikte suggesties opnieuw tonen
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      {header(
        <>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{suggesties.length} suggesties</span>
          {wachtMinuten !== null && (
            <span className="text-muted-foreground normal-case tracking-normal font-normal">
              · nieuwe suggesties over {wachtMinuten} {wachtMinuten === 1 ? 'minuut' : 'minuten'}
            </span>
          )}
        </>
      )}
      {aantalWeggeklikt && aantalWeggeklikt > 0 && onToonWeggeklikt ? (
        <button
          type="button"
          onClick={onToonWeggeklikt}
          className="mb-2 px-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          {aantalWeggeklikt} weggeklikte {aantalWeggeklikt === 1 ? 'suggestie' : 'suggesties'} opnieuw tonen
        </button>
      ) : null}
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
