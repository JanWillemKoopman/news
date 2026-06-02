'use client'

import * as React from 'react'
import { CalendarDays, LayoutList, Plus, Sparkles } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { TaskForm } from '@/components/bruiloft/taken/TaskForm'
import { TakenStatsStrip } from '@/components/bruiloft/taken/TakenStatsStrip'
import { TakenFilters } from '@/components/bruiloft/taken/TakenFilters'
import { AchterstandBanner } from '@/components/bruiloft/taken/AchterstandBanner'
import { BulkActionsBar } from '@/components/bruiloft/taken/BulkActionsBar'
import { AIVoorgesteldeTakenModal } from '@/components/bruiloft/taken/AIVoorgesteldeTakenModal'
import { ListView } from '@/components/bruiloft/taken/views/ListView'
import { CalendarView } from '@/components/bruiloft/taken/views/CalendarView'
import { Button, ConfirmDialog, useToast } from '@/components/bruiloft/ui'
import { applyFilters, DEFAULT_FILTERS, type TaakFilters } from '@/lib/bruiloft/taken/filters'
import { achterstalligeTaken, berekenTaakStats } from '@/lib/bruiloft/taken/stats'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { ISODate, Task, TaskInput, TaskStatus } from '@/lib/bruiloft/types'
import type { AITaakSuggestie } from '@/app/api/ai/taken/route'

type View = 'lijst' | 'kalender'

export function TakenShell() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const members = useBruiloftStore((s) => s.members)
  const addTask = useBruiloftStore((s) => s.addTask)
  const updateTask = useBruiloftStore((s) => s.updateTask)
  const deleteTask = useBruiloftStore((s) => s.deleteTask)
  const bulkUpdateTasks = useBruiloftStore((s) => s.bulkUpdateTasks)
  const bulkDeleteTasks = useBruiloftStore((s) => s.bulkDeleteTasks)
  const toggleSubtaak = useBruiloftStore((s) => s.toggleSubtaak)
  const addAITaken = useBruiloftStore((s) => s.addAITaken)
  const { toast } = useToast()

  const [view, setView] = React.useState<View>('lijst')
  const [filters, setFilters] = React.useState<TaakFilters>(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = React.useState(false)
  const [editTask, setEditTask] = React.useState<Task | null>(null)
  const [newTaskDeadline, setNewTaskDeadline] = React.useState<ISODate | null>(null)
  const [delTask, setDelTask] = React.useState<Task | null>(null)
  const [delBulkOpen, setDelBulkOpen] = React.useState(false)
  const [templatesOpen, setTemplatesOpen] = React.useState(false)
  const achterstandRef = React.useRef<HTMLDivElement | null>(null)

  const gefilterd = React.useMemo(() => applyFilters(tasks, filters), [tasks, filters])

  if (!wedding) return null

  const stats = berekenTaakStats(tasks)
  const achterstand = achterstalligeTaken(tasks).length

  const openNieuw = () => {
    setEditTask(null)
    setNewTaskDeadline(null)
    setFormOpen(true)
  }
  const openBewerk = (t: Task) => {
    setEditTask(t)
    setNewTaskDeadline(null)
    setFormOpen(true)
  }
  const openNieuwOpDatum = (date: ISODate) => {
    setEditTask(null)
    setNewTaskDeadline(date)
    setFormOpen(true)
  }

  const toggleStatus = async (t: Task) => {
    try {
      await updateTask(t.id, { status: t.status === 'klaar' ? 'open' : 'klaar' })
    } catch {
      toast({ title: 'Bijwerken mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  const toggleSelect = (t: Task) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(t.id)) next.delete(t.id)
      else next.add(t.id)
      return next
    })
  }
  const isSelected = (id: string) => selectedIds.has(id)
  const clearSelection = () => setSelectedIds(new Set())

  const handleQuickAdd = async (titel: string, deadline: ISODate) => {
    try {
      await addTask({
        titel,
        omschrijving: '',
        deadline,
        status: 'open',
        prioriteit: 'midden',
        toegewezenAan: 'samen',
        assignees: [],
        subtaken: [],
      })
    } catch {
      toast({ title: 'Toevoegen mislukt', variant: 'error' })
    }
  }

  const handleSubtaakToggle = async (t: Task, id: string) => {
    try {
      await toggleSubtaak(t.id, id)
    } catch {
      toast({ title: 'Subtaak bijwerken mislukt', variant: 'error' })
    }
  }

  const handleBulkStatus = async (status: TaskStatus) => {
    try {
      await bulkUpdateTasks(Array.from(selectedIds), { status })
      toast({ title: `${selectedIds.size} taken bijgewerkt`, variant: 'success' })
      clearSelection()
    } catch {
      toast({ title: 'Bijwerken mislukt', variant: 'error' })
    }
  }

  const handleBulkShift = async (dagen: number) => {
    if (dagen === 0) return
    try {
      await bulkUpdateTasks(Array.from(selectedIds), { deadlineShiftDays: dagen })
      toast({ title: `Deadlines verschoven`, variant: 'success' })
      clearSelection()
    } catch {
      toast({ title: 'Verschuiven mislukt', variant: 'error' })
    }
  }

  const handleCalendarShift = async (taskId: string, deadline: ISODate) => {
    try {
      await updateTask(taskId, { deadline })
    } catch {
      toast({ title: 'Verplaatsen mislukt', variant: 'error' })
    }
  }

  const springNaarAchterstand = () => {
    achterstandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <PageHeader
        titel="Taken"
        beschrijving="Werk stap voor stap naar de grote dag toe."
        actie={
          <Button onClick={openNieuw}>
            <Plus className="h-4 w-4" /> Taak toevoegen
          </Button>
        }
      />

      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => setTemplatesOpen(true)}
          className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        >
          <Sparkles className="h-4 w-4" />
          Voorgestelde taken
        </Button>
      </div>

      {stats.totaal > 0 ? <TakenStatsStrip tasks={tasks} wedding={wedding} /> : null}

      <AchterstandBanner aantal={achterstand} onSpringNaar={springNaarAchterstand} />

      <ViewSwitcher view={view} onChange={setView} />

      <TakenFilters filters={filters} onChange={setFilters} members={members} />

      {view === 'lijst' && (
        <ListView
          tasks={gefilterd}
          allTasks={tasks}
          wedding={wedding}
          members={members}
          onToggleStatus={toggleStatus}
          onEdit={openBewerk}
          onDelete={setDelTask}
          onToggleSubtaak={handleSubtaakToggle}
          onQuickAdd={handleQuickAdd}
          selectable={selectedIds.size > 0}
          isSelected={isSelected}
          onToggleSelect={toggleSelect}
          achterstandRef={achterstandRef}
        />
      )}

      {view === 'kalender' && (
        <CalendarView
          tasks={gefilterd}
          wedding={wedding}
          members={members}
          onToggleStatus={toggleStatus}
          onEdit={openBewerk}
          onDelete={setDelTask}
          onToggleSubtaak={handleSubtaakToggle}
          onShiftDeadline={handleCalendarShift}
          onAddTask={openNieuwOpDatum}
        />
      )}

      {selectedIds.size > 0 ? (
        <BulkActionsBar
          aantal={selectedIds.size}
          onClear={clearSelection}
          onSetStatus={handleBulkStatus}
          onShiftDeadline={handleBulkShift}
          onDelete={() => setDelBulkOpen(true)}
        />
      ) : null}

      <TaskForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setNewTaskDeadline(null) }}
        initial={editTask}
        defaultDeadline={editTask ? undefined : (newTaskDeadline ?? undefined)}
        vendors={vendors}
        budgetItems={budgetItems}
        members={members}
        onSubmit={async (data) => {
          try {
            if (editTask) {
              await updateTask(editTask.id, data)
              toast({ title: 'Taak bijgewerkt', variant: 'success' })
            } else {
              await addTask(data)
              toast({ title: 'Taak toegevoegd', variant: 'success' })
            }
          } catch {
            toast({ title: 'Opslaan mislukt', variant: 'error' })
          }
        }}
      />

      <ConfirmDialog
        open={delTask !== null}
        onOpenChange={(o) => !o && setDelTask(null)}
        title="Taak verwijderen?"
        description={delTask ? `Weet je zeker dat je "${delTask.titel}" wilt verwijderen?` : undefined}
        onConfirm={async () => {
          if (!delTask) return
          try {
            await deleteTask(delTask.id)
            toast({ title: 'Taak verwijderd', variant: 'success' })
          } catch {
            toast({ title: 'Verwijderen mislukt', variant: 'error' })
          }
        }}
      />

      <ConfirmDialog
        open={delBulkOpen}
        onOpenChange={setDelBulkOpen}
        title={`${selectedIds.size} taken verwijderen?`}
        description="Deze actie kan niet ongedaan gemaakt worden."
        onConfirm={async () => {
          try {
            await bulkDeleteTasks(Array.from(selectedIds))
            toast({ title: 'Taken verwijderd', variant: 'success' })
            clearSelection()
          } catch {
            toast({ title: 'Verwijderen mislukt', variant: 'error' })
          }
        }}
      />

      <AIVoorgesteldeTakenModal
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        tasks={tasks}
        wedding={wedding}
        onConfirm={async (aiTaken: AITaakSuggestie[]) => {
          type NewTask = Omit<TaskInput, 'weddingId' | 'tijdsblok'>
          const newTasks: NewTask[] = aiTaken.map((t) => ({
            titel: t.titel,
            omschrijving: t.omschrijving,
            deadline: t.deadline as ISODate,
            status: 'open',
            prioriteit: t.prioriteit,
            toegewezenAan: t.toegewezenAan,
            assignees: [],
            subtaken: [],
          }))
          try {
            await addAITaken(newTasks)
            toast({
              title: `${newTasks.length} ${newTasks.length === 1 ? 'taak' : 'taken'} toegevoegd`,
              variant: 'success',
            })
          } catch {
            toast({ title: 'Toevoegen mislukt', variant: 'error' })
          }
        }}
      />
    </div>
  )
}

function ViewSwitcher({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tabs: { key: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'lijst', label: 'Lijst', icon: LayoutList },
    { key: 'kalender', label: 'Kalender', icon: CalendarDays },
  ]
  return (
    <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
            view === t.key
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <t.icon className="h-4 w-4" />
          {t.label}
        </button>
      ))}
    </div>
  )
}
