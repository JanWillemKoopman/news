'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AccessPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      if (!res.ok) {
        setError('Verkeerde code — probeer opnieuw.')
        return
      }
      router.push('/sollicitatie')
    } catch {
      setError('Er is iets misgegaan. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              The Ultimate Cover Letter Agent
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Voer de toegangscode in om verder te gaan.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock size={15} className="text-muted-foreground" />
              Toegangscode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="sr-only">
                  Code
                </Label>
                <Input
                  id="code"
                  type="password"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setError(null)
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={!code.trim() || loading}>
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Controleren…
                  </>
                ) : (
                  'Toegang krijgen'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
