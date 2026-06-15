'use client'

import { AlertTriangle, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PartnerUitnodigen } from '@/components/bruiloft/PartnerUitnodigen'
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
import { createClient } from '@/lib/supabase/client'
import { useBruiloftStore } from '@/store/bruiloftStore'

type Member = { user_id: string; email: string | null; display_name: string | null; role: string }

export default function SamenPlannenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const { toast } = useToast()
  const router = useRouter()
  const deleteActiveWedding = useBruiloftStore((s) => s.deleteActiveWedding)
  const supabase = React.useMemo(() => createClient(), [])

  const [members, setMembers] = React.useState<Member[]>([])
  const [removeTarget, setRemoveTarget] = React.useState<Member | null>(null)
  const [delWeddingOpen, setDelWeddingOpen] = React.useState(false)
  const [delBusy, setDelBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!wedding) return
    const { data } = await supabase.rpc('list_wedding_members', { p_wedding: wedding.id })
    setMembers((data as Member[]) ?? [])
  }, [supabase, wedding])

  React.useEffect(() => {
    void load()
  }, [load])

  if (!wedding) return null

  async function confirmRemove() {
    if (!removeTarget) return
    const { error } = await supabase
      .from('wedding_members')
      .delete()
      .eq('wedding_id', wedding!.id)
      .eq('user_id', removeTarget.user_id)
    setRemoveTarget(null)
    if (error) {
      toast({ title: 'Kon toegang niet intrekken', description: error.message, variant: 'error' })
      return
    }
    toast({ title: 'Toegang ingetrokken' })
    void load()
  }

  async function onDeleteWedding() {
    setDelBusy(true)
    try {
      await deleteActiveWedding()
      router.push('/bruiloft')
      router.refresh()
    } catch {
      setDelBusy(false)
      setDelWeddingOpen(false)
      toast({ title: 'Verwijderen mislukt', description: 'Probeer het later opnieuw.', variant: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-24 min-h-screen">
      <PageHeader
        titel="Samen plannen"
        beschrijving="Nodig je partner uit zodat jullie samen aan het trouwplan werken."
      />

      <div className="space-y-6">
        {/* Partner uitnodigen (verdwijnt zodra de partner is toegevoegd) */}
        <PartnerUitnodigen dismissible={false} onInvited={() => void load()} />

        {/* Wie heeft toegang */}
        <Card>
          <CardHeader>
            <CardTitle>Wie heeft toegang</CardTitle>
            <CardDescription>Iedereen hier kan samen aan het trouwplan werken.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => {
              const isSelf = m.user_id === currentUser?.id
              return (
                <div
                  key={m.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {m.display_name || m.email || 'Onbekend'}
                      {isSelf ? <span className="ml-1 text-muted-foreground">(jij)</span> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  {!isSelf ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Toegang intrekken"
                      onClick={() => setRemoveTarget(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Bruiloft verwijderen</CardTitle>
            <CardDescription>
              Verwijder deze bruiloft en alle bijbehorende gegevens (gasten, taken, budget,
              leveranciers, draaiboek, tafels en website). Dit kan niet ongedaan worden gemaakt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDelWeddingOpen(true)} loading={delBusy}>
              <AlertTriangle className="h-4 w-4" />
              Bruiloft verwijderen
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Toegang intrekken?"
        description={`Weet je zeker dat je ${removeTarget?.display_name || removeTarget?.email} de toegang wilt ontnemen?`}
        bevestigLabel="Intrekken"
        onConfirm={confirmRemove}
      />

      <ConfirmDialog
        open={delWeddingOpen}
        onOpenChange={(o) => !o && setDelWeddingOpen(false)}
        title="Bruiloft definitief verwijderen?"
        description={`Alle gegevens van "${wedding.partner1Naam} & ${wedding.partner2Naam}" worden permanent verwijderd.`}
        bevestigLabel="Ja, verwijder bruiloft"
        onConfirm={onDeleteWedding}
      />
    </div>
  )
}
