'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  useToast,
} from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'

export default function AccountPage() {
  const router = useRouter()
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const signOut = useBruiloftStore((s) => s.signOut)
  const { toast } = useToast()
  const [confirm, setConfirm] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  if (!currentUser) return null

  async function deleteAccount() {
    setBusy(true)
    const res = await fetch('/account/verwijderen', { method: 'POST' })
    if (!res.ok) {
      setBusy(false)
      toast({ title: 'Verwijderen mislukt', description: 'Probeer het later opnieuw.', variant: 'error' })
      return
    }
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader titel="Account" beschrijving="Beheer je accountgegevens." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Gegevens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <p>
            <span className="text-muted-foreground">Naam: </span>
            {currentUser.displayName || '—'}
          </p>
          <p>
            <span className="text-muted-foreground">E-mail: </span>
            {currentUser.email}
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Account verwijderen</CardTitle>
          <CardDescription>
            Dit verwijdert je account definitief. Bruiloften waarvan jij de enige eigenaar bent —
            inclusief alle gasten, taken en budget — worden ook verwijderd. Dit kan niet ongedaan
            worden gemaakt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirm(true)} loading={busy}>
            Account verwijderen
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => !o && setConfirm(false)}
        title="Account definitief verwijderen?"
        description="Je account en de bruiloften waarvan jij de enige eigenaar bent worden permanent verwijderd."
        bevestigLabel="Ja, verwijder mijn account"
        onConfirm={deleteAccount}
      />
    </div>
  )
}
