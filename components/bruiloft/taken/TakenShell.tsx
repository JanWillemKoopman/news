'use client'

import * as React from 'react'
import { Plus, Sparkles } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { takenInfo } from '@/components/bruiloft/faqContent'
import { TakenSamenstellen } from '@/components/bruiloft/taken/TakenSamenstellen'
import { TaskForm } from '@/components/bruiloft/taken/TaskForm'
import { TakenStatsStrip } from '@/components/bruiloft/taken/TakenStatsStrip'
import { TakenFilters } from '@/components/bruiloft/taken/TakenFilters'
import { BulkActionsBar } from '@/components/bruiloft/taken/BulkActionsBar'
import { ListView } from '@/components/bruiloft/taken/views/ListView'
import { CalendarView } from '@/components/bruiloft/taken/views/CalendarView'
import { Button, ConfirmDialog, useToast, type KolomAantal } from '@/components/bruiloft/ui'
import { applyFilters, DEFAULT_FILTERS, type TaakFilters } from '@/lib/bruiloft/taken/filters'
import { useScrollRestore } from '@/lib/bruiloft/useScrollRestore'
import { berekenTaakStats } from '@/lib/bruiloft/taken/stats'
import { openVoorstellen } from '@/lib/bruiloft/taken/voorstellen'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { ISODate, Task, TaskStatus } from '@/lib/bruiloft/types'

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
  const { toast } = useToast()

  const [view, setView] = React.useState<View>('lijst')
  const [kolommen, setKolommen] = React.useState<KolomAantal>(1)
  const [filters, setFilters] = React.useState<TaakFilters>(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = React.useState(false)
  const [editTask, setEditTask] = React.useState<Task | null>(null)
  const [newTaskDeadline, setNewTaskDeadline] = React.useState<ISODate | null>(null)
  const [delTask, setDelTask] = React.useState<Task | null>(null)
  const [delBulkOpen, setDelBulkOpen] = React.useState(false)
  const { save: saveScroll, restore: restoreScroll } = useScrollRestore()
  const savedScroll = React.useRef(0)

  // Kaart-voor-kaart samenstellen van de takenlijst (sjabloonvoorstellen).
  const updateWedding = useBruiloftStore((s) => s.updateWedding)
  const [samenstellenOpen, setSamenstellenOpen] = React.useState(false)
  React.useEffect(() => {
    if (!wedding) return
    // Vanaf het dashboard (welkomstdialoog/startgids) direct openen. De
    // parameter daarna uit de URL halen, zodat herladen of delen van de link
    // de modal niet opnieuw opdringt.
    if (new URLSearchParams(window.location.search).get('samenstellen') === '1') {
      setSamenstellenOpen(true)
      window.history.replaceState(null, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wedding?.id])

  const gefilterd = React.useMemo(() => applyFilters(tasks, filters), [tasks, filters])

  if (!wedding) return null

  const stats = berekenTaakStats(tasks)
  const voorstellenOver = wedding.takenVoorstellen.afgerond
    ? []
    : openVoorstellen(wedding, tasks)

  const verbergSamenstellen = async () => {
    try {
      await updateWedding({ takenVoorstellen: { ...wedding.takenVoorstellen, afgerond: true } })
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  const openNieuw = () => {
    savedScroll.current = saveScroll()
    setEditTask(null)
    setNewTaskDeadline(null)
    setFormOpen(true)
  }
  const openBewerk = (t: Task) => {
    savedScroll.current = saveScroll()
    setEditTask(t)
    setNewTaskDeadline(null)
    setFormOpen(true)
  }
  const openNieuwOpDatum = (date: ISODate) => {
    savedScroll.current = saveScroll()
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

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Taken"
        info={<PageInfoButton {...takenInfo} />}
        primaryActie={
          <Button onClick={openNieuw}>
            <Plus className="h-4 w-4" /> Taak toevoegen
          </Button>
        }
        fab={{ label: 'Taak toevoegen', onClick: openNieuw }}
      />

      {/* Voorstellen-banner: zolang er sjabloontaken te beoordelen zijn */}
      {voorstellenOver.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {tasks.length === 0
                ? 'Stel jullie takenlijst samen'
                : 'Ga verder met jullie takenlijst'}
            </p>
            <p className="text-xs text-muted-foreground">
              {voorstellenOver.length}{' '}
              {voorstellenOver.length === 1 ? 'voorstel' : 'voorstellen'} om te beoordelen — kies
              kaart voor kaart wat bij jullie past.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={() => setSamenstellenOpen(true)}>
              {tasks.length === 0 ? 'Beginnen' : 'Ga verder'}
            </Button>
            <button
              type="button"
              onClick={verbergSamenstellen}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Niet meer tonen
            </button>
          </div>
        </div>
      ) : null}

      {stats.totaal > 0 ? <TakenStatsStrip tasks={tasks} wedding={wedding} /> : null}

      <TakenFilters
        filters={filters}
        onChange={setFilters}
        members={members}
        view={view}
        onViewChange={setView}
        kolommen={kolommen}
        onKolommenChange={setKolommen}
      />

      {view === 'lijst' && (
        <ListView
          tasks={gefilterd}
          allTasks={tasks}
          wedding={wedding}
          members={members}
          kolommen={kolommen}
          onToggleStatus={toggleStatus}
          onEdit={openBewerk}
          onDelete={setDelTask}
          onToggleSubtaak={handleSubtaakToggle}
          onOpenForm={openNieuwOpDatum}
          selectable={selectedIds.size > 0}
          isSelected={isSelected}
          onToggleSelect={toggleSelect}
          onResetFilters={() => setFilters(DEFAULT_FILTERS)}
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

      <TakenSamenstellen open={samenstellenOpen} onOpenChange={setSamenstellenOpen} />

      <TaskForm
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) {
            setNewTaskDeadline(null)
            restoreScroll(savedScroll.current)
          }
        }}
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
          } catch (e) {
            toast({ title: 'Opslaan mislukt', variant: 'error' })
            throw e
          }
        }}
      />

      <ConfirmDialog
        open={delTask !== null}
        onOpenChange={(o) => !o && setDelTask(null)}
        title="Taak verwijderen?"
        description={
          delTask ? `Weet je zeker dat je "${delTask.titel}" wilt verwijderen?` : undefined
        }
        onConfirm={async () => {
          if (!delTask) return
          const verwijderd = delTask
          try {
            await deleteTask(verwijderd.id)
            toast({
              title: 'Taak verwijderd',
              description: verwijderd.titel,
              variant: 'success',
              duration: 7000,
              action: {
                label: 'Ongedaan maken',
                onClick: () => {
                  void addTask({
                    titel: verwijderd.titel,
                    omschrijving: verwijderd.omschrijving,
                    deadline: verwijderd.deadline,
                    status: verwijderd.status,
                    prioriteit: verwijderd.prioriteit,
                    toegewezenAan: verwijderd.toegewezenAan,
                    assignees: verwijderd.assignees,
                    subtaken: verwijderd.subtaken,
                    vendorId: verwijderd.vendorId,
                    budgetItemId: verwijderd.budgetItemId,
                  })
                },
              },
            })
          } catch {
            toast({ title: 'Verwijderen mislukt', variant: 'error' })
          }
        }}
      />

      <ConfirmDialog
        open={delBulkOpen}
        onOpenChange={setDelBulkOpen}
        title={`${selectedIds.size} taken verwijderen?`}
        description={`${selectedIds.size} ${selectedIds.size === 1 ? 'taak wordt' : 'taken worden'} permanent verwijderd.`}
        onConfirm={async () => {
          const teVerwijderen = tasks.filter((t) => selectedIds.has(t.id))
          try {
            await bulkDeleteTasks(Array.from(selectedIds))
            clearSelection()
            toast({
              title: `${teVerwijderen.length} taken verwijderd`,
              variant: 'success',
              duration: 7000,
              action: {
                label: 'Ongedaan maken',
                onClick: () => {
                  void Promise.all(
                    teVerwijderen.map((t) =>
                      addTask({
                        titel: t.titel,
                        omschrijving: t.omschrijving,
                        deadline: t.deadline,
                        status: t.status,
                        prioriteit: t.prioriteit,
                        toegewezenAan: t.toegewezenAan,
                        assignees: t.assignees,
                        subtaken: t.subtaken,
                        vendorId: t.vendorId,
                        budgetItemId: t.budgetItemId,
                      })
                    )
                  )
                },
              },
            })
          } catch {
            toast({ title: 'Verwijderen mislukt', variant: 'error' })
          }
        }}
      />
    </div>
  )
}
