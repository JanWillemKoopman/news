'use client'

import * as React from 'react'

import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/components/bruiloft/ui'
import { TaskComments } from '@/components/bruiloft/taken/TaskComments'
import { AssigneePicker } from '@/components/bruiloft/taken/AssigneePicker'
import { SubtakenList } from '@/components/bruiloft/taken/SubtakenList'
import { DateRoller } from '@/components/bruiloft/taken/DateRoller'
import { PRIORITEITEN, TASK_STATUSSEN } from '@/lib/bruiloft/options'
import type { BudgetItem, ID, Task, TaskInput, Vendor, WeddingMember } from '@/lib/bruiloft/types'

type NewTask = Omit<TaskInput, 'weddingId' | 'tijdsblok'>

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Task | null
  defaultDeadline?: string
  vendors: Vendor[]
  budgetItems: BudgetItem[]
  members: WeddingMember[]
  onSubmit: (data: NewTask) => void
}

function vandaagISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function leeg(deadline = ''): NewTask {
  return {
    titel: '',
    omschrijving: '',
    deadline: deadline || vandaagISO(),
    status: 'open',
    prioriteit: 'midden',
    toegewezenAan: 'samen',
    assignees: [],
    subtaken: [],
    vendorId: undefined,
    budgetItemId: undefined,
  }
}

function vanTask(t: Task): NewTask {
  return {
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
  }
}

export function TaskForm({
  open,
  onOpenChange,
  initial,
  defaultDeadline,
  vendors,
  budgetItems,
  members,
  onSubmit,
}: TaskFormProps) {
  const [form, setForm] = React.useState<NewTask>(() => leeg(defaultDeadline))
  const [titelFout, setTitelFout] = React.useState(false)
  const [deadlineFout, setDeadlineFout] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm(initial ? vanTask(initial) : leeg(defaultDeadline))
      setTitelFout(false)
      setDeadlineFout(false)
    }
  }, [open, initial, defaultDeadline])

  const set = <K extends keyof NewTask>(key: K, value: NewTask[K]) => {
    if (key === 'titel' && titelFout) setTitelFout(false)
    if (key === 'deadline' && deadlineFout) setDeadlineFout(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const titelLeeg = !form.titel.trim()
    const deadlineLeeg = !form.deadline
    if (titelLeeg || deadlineLeeg) {
      setTitelFout(titelLeeg)
      setDeadlineFout(deadlineLeeg)
      return
    }
    // Strip lege subtaken.
    const subtaken = form.subtaken.filter((s) => s.titel.trim() !== '')
    onSubmit({ ...form, titel: form.titel.trim(), subtaken })
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={initial ? 'Taak bewerken' : 'Taak toevoegen'}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Titel"
          htmlFor="titel"
          required
          error={titelFout ? 'Vul een titel in' : undefined}
        >
          <Input
            id="titel"
            value={form.titel}
            aria-invalid={titelFout || undefined}
            onChange={(e) => set('titel', e.target.value)}
          />
        </Field>

        <Field label="Omschrijving" htmlFor="oms">
          <Textarea
            id="oms"
            value={form.omschrijving}
            onChange={(e) => set('omschrijving', e.target.value)}
            rows={2}
          />
        </Field>

        <Field label="Subtaken">
          <SubtakenList subtaken={form.subtaken} onChange={(s) => set('subtaken', s)} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Deadline" required error={deadlineFout ? 'Kies een deadline' : undefined}>
            <DateRoller
              value={form.deadline}
              onChange={(v) => set('deadline', v)}
            />
          </Field>
          <Field label="Status" htmlFor="st">
            <Select
              id="st"
              value={form.status}
              onChange={(e) => set('status', e.target.value as NewTask['status'])}
            >
              {TASK_STATUSSEN.map((s) => (
                <option key={s} value={s}>
                  {s === 'bezig' ? 'In uitvoering' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Prioriteit" htmlFor="prio">
            <Select
              id="prio"
              value={form.prioriteit}
              onChange={(e) => set('prioriteit', e.target.value as NewTask['prioriteit'])}
            >
              {PRIORITEITEN.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Toegewezen aan">
            <AssigneePicker
              value={form.assignees}
              members={members}
              onChange={(ids: ID[]) => set('assignees', ids)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Leverancier (optioneel)" htmlFor="ven">
            <Select
              id="ven"
              value={form.vendorId ?? ''}
              onChange={(e) => set('vendorId', e.target.value || undefined)}
            >
              <option value="">Geen</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.naam}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Budgetitem (optioneel)" htmlFor="bud">
            <Select
              id="bud"
              value={form.budgetItemId ?? ''}
              onChange={(e) => set('budgetItemId', e.target.value || undefined)}
            >
              <option value="">Geen</option>
              {budgetItems.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.omschrijving || b.categorie}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit">{initial ? 'Opslaan' : 'Toevoegen'}</Button>
        </div>
      </form>

      {initial ? (
        <div className="mt-5">
          <TaskComments taskId={initial.id} />
        </div>
      ) : null}
    </Modal>
  )
}
