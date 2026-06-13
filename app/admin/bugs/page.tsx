import { Bug, AlertTriangle, Info } from 'lucide-react'
import { createRawAdminClient } from '@/lib/supabase/admin'

export const revalidate = 30

interface ErrorLog {
  id: string
  created_at: string
  level: 'error' | 'warning' | 'info'
  message: string
  stack: string | null
  path: string | null
  component: string | null
  metadata: Record<string, unknown> | null
  user_id: string | null
}

async function getErrors(): Promise<ErrorLog[]> {
  const admin = createRawAdminClient()
  const { data, error } = await admin
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return []
  return (data ?? []) as ErrorLog[]
}

function LevelIcon({ level }: { level: string }) {
  if (level === 'error')   return <Bug className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
  if (level === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
  return <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
}

function LevelBadge({ level }: { level: string }) {
  if (level === 'error')
    return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">error</span>
  if (level === 'warning')
    return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">warning</span>
  return <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">info</span>
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso))
}

export default async function BugsPage() {
  const errors = await getErrors()

  const counts = {
    error:   errors.filter(e => e.level === 'error').length,
    warning: errors.filter(e => e.level === 'warning').length,
    info:    errors.filter(e => e.level === 'info').length,
  }

  const recent24h = errors.filter(
    e => new Date(e.created_at) > new Date(Date.now() - 86400_000)
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bugs &amp; Fouten</h1>
        <p className="text-sm text-gray-500 mt-1">Automatisch vastgelegd via de app — laatste 200 meldingen</p>
      </div>

      {/* Tellers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CountCard label="Fouten (24u)" value={recent24h} highlight={recent24h > 0} />
        <CountCard label="Errors totaal" value={counts.error} color="red" />
        <CountCard label="Warnings" value={counts.warning} color="yellow" />
        <CountCard label="Info" value={counts.info} color="blue" />
      </div>

      {errors.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
          <Bug className="h-8 w-8" />
          <p className="text-sm">Geen meldingen — de app draait probleemloos</p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((e) => (
            <details key={e.id} className="group rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <summary className="flex cursor-pointer items-start gap-3 px-4 py-3 list-none hover:bg-gray-50 transition-colors">
                <LevelIcon level={e.level} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <LevelBadge level={e.level} />
                    {e.path && (
                      <span className="text-xs font-mono text-gray-400 truncate max-w-[200px]">{e.path}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto shrink-0">{formatDateTime(e.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-800 truncate">{e.message}</p>
                  {e.component && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">Component: {e.component}</p>
                  )}
                </div>
              </summary>

              <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3 text-xs">
                {e.user_id && (
                  <p><span className="font-medium text-gray-600">User ID:</span> <span className="font-mono text-gray-500">{e.user_id}</span></p>
                )}
                {e.stack && (
                  <div>
                    <p className="font-medium text-gray-600 mb-1">Stack trace:</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-gray-900 text-green-300 px-3 py-2 text-xs leading-relaxed max-h-48">
                      {e.stack}
                    </pre>
                  </div>
                )}
                {e.metadata && Object.keys(e.metadata).length > 0 && (
                  <div>
                    <p className="font-medium text-gray-600 mb-1">Metadata:</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-gray-100 px-3 py-2 text-gray-700 max-h-48">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}

function CountCard({
  label, value, highlight, color,
}: {
  label: string
  value: number
  highlight?: boolean
  color?: 'red' | 'yellow' | 'blue'
}) {
  const colorClass =
    highlight ? 'border-red-200 bg-red-50' :
    color === 'red' ? 'border-red-50' :
    color === 'yellow' ? 'border-yellow-50' :
    color === 'blue' ? 'border-blue-50' :
    'border-gray-100'

  const textClass =
    highlight ? 'text-red-700' :
    color === 'red' ? 'text-red-600' :
    color === 'yellow' ? 'text-yellow-600' :
    color === 'blue' ? 'text-blue-600' :
    'text-gray-900'

  return (
    <div className={`rounded-xl border bg-white px-4 py-3 shadow-sm ${colorClass}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-0.5 ${textClass}`}>{value}</p>
    </div>
  )
}
