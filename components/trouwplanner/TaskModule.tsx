'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useWeddingStore } from '@/store/weddingStore'
import { cn } from '@/lib/utils'

const GROUP_LABELS: Record<number, string> = {
  12: '12 maanden van tevoren',
  9: '9 maanden van tevoren',
  6: '6 maanden van tevoren',
  3: '3 maanden van tevoren',
  1: '1 maand van tevoren',
  0: 'Week van de bruiloft',
}

function getDaysUntilWedding(dateStr: string | null): number | null {
  if (!dateStr) return null
  const wedding = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  wedding.setHours(0, 0, 0, 0)
  return Math.round((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function isCurrentGroup(monthsBefore: number, days: number | null): boolean {
  if (days === null) return false
  const monthsLeft = days / 30
  const nextGroup = [12, 9, 6, 3, 1, 0].find((m) => m <= monthsLeft)
  return nextGroup === monthsBefore
}

export default function TaskModule() {
  const { tasks, toggleTask, addTask, wedding } = useWeddingStore()
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newMonth, setNewMonth] = useState(3)

  const days = getDaysUntilWedding(wedding.date)
  const totalCompleted = tasks.filter((t) => t.completed).length
  const pct = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0

  const groups = [12, 9, 6, 3, 1, 0].map((m) => ({
    monthsBefore: m,
    label: GROUP_LABELS[m],
    tasks: tasks.filter((t) => t.monthsBefore === m),
    isCurrent: isCurrentGroup(m, days),
  }))

  function handleAdd() {
    if (!newTitle.trim()) return
    addTask({
      monthsBefore: newMonth,
      title: newTitle.trim(),
      category: 'planning',
      completed: false,
    })
    setNewTitle('')
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-stone-900">{totalCompleted} van {tasks.length} taken gedaan</p>
            <p className="text-xs text-stone-400 mt-0.5">{pct}% van de planning voltooid</p>
          </div>
          <span className="text-2xl font-bold text-rose-500">{pct}%</span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Groups */}
      {groups.map(({ monthsBefore, label, tasks: groupTasks, isCurrent }) => {
        if (groupTasks.length === 0) return null
        const done = groupTasks.filter((t) => t.completed).length
        return (
          <div
            key={monthsBefore}
            className={cn(
              'bg-white rounded-2xl border overflow-hidden',
              isCurrent ? 'border-rose-300 shadow-sm shadow-rose-100' : 'border-stone-100'
            )}
          >
            <div className={cn(
              'px-4 py-3 flex items-center justify-between',
              isCurrent ? 'bg-rose-50' : 'bg-stone-50'
            )}>
              <span className={cn(
                'text-sm font-semibold',
                isCurrent ? 'text-rose-700' : 'text-stone-600'
              )}>
                {label}
                {isCurrent && (
                  <span className="ml-2 text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-medium">
                    Nu
                  </span>
                )}
              </span>
              <span className="text-xs text-stone-400 font-medium">
                {done}/{groupTasks.length}
              </span>
            </div>
            <div className="divide-y divide-stone-50">
              {groupTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    task.completed
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-stone-300 hover:border-rose-400'
                  )}>
                    {task.completed && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className={cn(
                    'text-sm transition-colors',
                    task.completed ? 'line-through text-stone-400' : 'text-stone-700'
                  )}>
                    {task.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-rose-200 p-5 space-y-3 animate-fade-in">
          <p className="font-semibold text-stone-800 text-sm">Nieuwe taak</p>
          <input
            type="text"
            placeholder="Beschrijf de taak..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full border border-stone-200 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
          />
          <select
            value={newMonth}
            onChange={(e) => setNewMonth(Number(e.target.value))}
            className="w-full border border-stone-200 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors bg-white"
          >
            {[12, 9, 6, 3, 1, 0].map((m) => (
              <option key={m} value={m}>{GROUP_LABELS[m]}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-stone-100 disabled:text-stone-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Toevoegen
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100 transition-colors"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-stone-200 hover:border-rose-300 text-stone-400 hover:text-rose-500 rounded-2xl py-4 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Voeg taak toe
        </button>
      )}
    </div>
  )
}
