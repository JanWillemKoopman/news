'use client'

import * as React from 'react'
import { Check, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { TaskForm } from '@/components/bruiloft/taken/TaskForm'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Progress,
  Select,
  StatusBadge,
  useToast,
} from '@/components/bruiloft/ui'
import { taakTellingen } from '@/lib/bruiloft/derived'
import { dagenTot, formatDatumKort } from '@/lib/bruiloft/format'
import { TASK_STATUSSEN, TOEGEWEZEN_AAN } from '@/lib/bruiloft/options'
import { TIJDSBLOK_VOLGORDE } from '@/lib/bruiloft/timeblocks'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Task } from '@/lib/bruiloft/types'

export default function TakenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const addTask = useBruiloftStore((s) => s.addTask)
  const updateTask = useBruiloftStore((s) => s.updateTask)
  const deleteTask = useBruiloftStore((s) => s.deleteTask)
  const { toast } = useToast()

  const [fStatus, setFStatus] = React.useState('all')
  const [fToegewezen, setFToegewezen] = React.useState('all')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editTask, setEditTask] = React.useState<Task | null>(null)
  const [delTask, setDelTask] = React.useState<Task | null>(null)

  if (!wedding) return null

  const tellingen = taakTellingen(tasks)
  const pctKlaar = tellingen.totaal > 0 ? Math.round((tellingen.klaar / tellingen.totaal) * 100) : 0

  const gefilterd = tasks.filter((t) => {
    if (fStatus !== 'all' && t.status !== fStatus) return false
    if (fToegewezen !== 'all' && t.toegewezenAan !== fToegewezen) return false
    return true
  })

  const openNieuw = () => {
    setEditTask(null)
    setFormOpen(true)
  }
  const openBewerk = (t: Task) => {
    setEditTask(t)
    setFormOpen(true)
  }

  const toggleKlaar = (t: Task) =>
    void updateTask(t.id, { status: t.status === 'klaar' ? 'open' : 'klaar' })

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titel="Taken en tijdlijn"
        beschrijving="Werk stap voor stap naar de grote dag toe."
        actie={
          <Button onClick={openNieuw}>
            <Plus className="h-4 w-4" /> Taak
          </Button>
        }
      />

      {tasks.length > 0 ? (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {tellingen.klaar} van {tellingen.totaal} taken afgerond
              </span>
              <span className="text-muted-foreground">{pctKlaar}%</span>
            </div>
            <Progress value={pctKlaar} />
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">Alle statussen</option>
          {TASK_STATUSSEN.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={fToegewezen} onChange={(e) => setFToegewezen(e.target.value)}>
          <option value="all">Iedereen</option>
          {TOEGEWEZEN_AAN.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          titel="Nog geen taken"
          beschrijving="Voeg taken toe of stel je bruiloft in om automatisch een takenlijst te krijgen."
          actie={
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Taak toevoegen
            </Button>
          }
        />
      ) : gefilterd.length === 0 ? (
        <EmptyState icon={ListChecks} titel="Geen taken gevonden" beschrijving="Pas je filters aan." />
      ) : (
        <div className="space-y-8">
          {TIJDSBLOK_VOLGORDE.map((blok) => {
            const blokTaken = gefilterd
              .filter((t) => t.tijdsblok === blok)
              .sort((a, b) => a.deadline.localeCompare(b.deadline))
            if (blokTaken.length === 0) return null
            return (
              <div key={blok}>
                <h2 className="mb-3 flex items-center gap-2 px-1 font-serif text-lg capitalize text-foreground">
                  {blok}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {blokTaken.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {blokTaken.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onToggle={toggleKlaar}
                      onEdit={openBewerk}
                      onDelete={setDelTask}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTask}
        vendors={vendors}
        budgetItems={budgetItems}
        onSubmit={(data) => {
          if (editTask) {
            void updateTask(editTask.id, data)
            toast({ title: 'Taak bijgewerkt', variant: 'success' })
          } else {
            void addTask(data)
            toast({ title: 'Taak toegevoegd', variant: 'success' })
          }
        }}
      />

      <ConfirmDialog
        open={delTask !== null}
        onOpenChange={(o) => !o && setDelTask(null)}
        title="Taak verwijderen?"
        description={delTask ? `Weet je zeker dat je "${delTask.titel}" wilt verwijderen?` : undefined}
        onConfirm={() => {
          if (delTask) {
            void deleteTask(delTask.id)
            toast({ title: 'Taak verwijderd', variant: 'success' })
          }
        }}
      />
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task
  onToggle: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
}) {
  const klaar = task.status === 'klaar'
  const d = dagenTot(task.deadline)
  return (
    <Card className={cn('transition-opacity', klaar && 'opacity-60')}>
      <CardContent className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => onToggle(task)}
          aria-label={klaar ? 'Markeer als open' : 'Markeer als klaar'}
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            klaar
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-border hover:border-primary'
          )}
        >
          {klaar ? <Check className="h-4 w-4" /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <p className={cn('font-medium text-foreground', klaar && 'line-through')}>{task.titel}</p>
          {task.omschrijving ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{task.omschrijving}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDatumKort(task.deadline)}</span>
            {!klaar ? (
              <span className={cn(d < 0 && 'font-medium text-rose-600 dark:text-rose-400')}>
                {d >= 0 ? `over ${d} dagen` : `${Math.abs(d)} dagen te laat`}
              </span>
            ) : null}
            <StatusBadge kind="prioriteit" value={task.prioriteit} />
            <span className="capitalize">{task.toegewezenAan}</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" aria-label="Bewerken" onClick={() => onEdit(task)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Verwijderen" onClick={() => onDelete(task)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
