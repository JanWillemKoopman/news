'use client'

import * as React from 'react'
import { Trash2 } from 'lucide-react'

import { Button, Textarea, useToast } from '@/components/bruiloft/ui'
import { tijdGeleden } from '@/lib/bruiloft/format'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useBruiloftStore } from '@/store/bruiloftStore'

export function TaskComments({ taskId }: { taskId: string }) {
  const all = useBruiloftStore((s) => s.taskComments)
  const permissions = useBruiloftStore((s) => s.permissions)
  const role = useBruiloftStore((s) => s.role)
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const addTaskComment = useBruiloftStore((s) => s.addTaskComment)
  const deleteTaskComment = useBruiloftStore((s) => s.deleteTaskComment)
  const { toast } = useToast()

  const [body, setBody] = React.useState('')
  const [bezig, setBezig] = React.useState(false)

  const mayPost = canEdit(permissions, 'taken')
  const comments = all
    .filter((c) => c.taskId === taskId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const tekst = body.trim()
    if (!tekst || bezig) return
    setBezig(true)
    try {
      await addTaskComment(taskId, tekst)
      setBody('')
    } catch {
      toast({ title: 'Opmerking plaatsen mislukt', variant: 'error' })
    } finally {
      setBezig(false)
    }
  }

  const verwijder = async (id: string) => {
    try {
      await deleteTaskComment(id)
    } catch {
      toast({ title: 'Verwijderen mislukt', variant: 'error' })
    }
  }

  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-3 text-sm font-medium text-foreground">
        Opmerkingen{comments.length > 0 ? ` (${comments.length})` : ''}
      </h3>

      {comments.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">Nog geen opmerkingen.</p>
      ) : (
        <ul className="mb-3 space-y-3">
          {comments.map((c) => {
            const mag = c.authorId === currentUser?.id || role === 'owner'
            return (
              <li key={c.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1 rounded-lg bg-secondary/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {c.authorName || 'Onbekend'}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {tijdGeleden(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                    {c.body}
                  </p>
                </div>
                {mag ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Opmerking verwijderen"
                    onClick={() => void verwijder(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {mayPost ? (
        <form onSubmit={submit} className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Schrijf een opmerking…"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={bezig} disabled={!body.trim()}>
              Plaats
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
