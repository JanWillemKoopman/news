'use client'

import { AlertTriangle, Copy, Mail, Trash2, UserPlus } from 'lucide-react'
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
  Field,
  Input,
  Select,
  useToast,
} from '@/components/bruiloft/ui'
import {
  EDITABLE_ROLES,
  EMPTY_PERMISSIONS,
  LEVEL_LABELS,
  MODULE_LABELS,
  MODULES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type Level,
  type Module,
  type PermissionMap,
  type WeddingRole,
} from '@/lib/bruiloft/permissions'
import { createClient } from '@/lib/supabase/client'
import { useBruiloftStore } from '@/store/bruiloftStore'

type Member = { user_id: string; email: string | null; display_name: string | null; role: WeddingRole }
type Invite = { id: string; email: string; role: string; token: string; expires_at: string }
type Matrix = Record<'planner' | 'helper' | 'viewer', PermissionMap>

const emptyMatrix = (): Matrix => ({
  planner: { ...EMPTY_PERMISSIONS },
  helper: { ...EMPTY_PERMISSIONS },
  viewer: { ...EMPTY_PERMISSIONS },
})

export default function LedenBeheerPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const { toast } = useToast()
  const router = useRouter()
  const deleteActiveWedding = useBruiloftStore((s) => s.deleteActiveWedding)
  const supabase = React.useMemo(() => createClient(), [])

  const [members, setMembers] = React.useState<Member[]>([])
  const [invites, setInvites] = React.useState<Invite[]>([])
  const [matrix, setMatrix] = React.useState<Matrix>(emptyMatrix)

  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState<WeddingRole>('helper')
  const [inviting, setInviting] = React.useState(false)
  const [removeTarget, setRemoveTarget] = React.useState<Member | null>(null)
  const [delWeddingOpen, setDelWeddingOpen] = React.useState(false)
  const [delBusy, setDelBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!wedding) return
    const [mem, inv, perms] = await Promise.all([
      supabase.rpc('list_wedding_members', { p_wedding: wedding.id }),
      supabase
        .from('wedding_invites')
        .select('id, email, role, token, expires_at')
        .eq('wedding_id', wedding.id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('wedding_role_permissions')
        .select('role, module, level')
        .eq('wedding_id', wedding.id),
    ])
    setMembers((mem.data as Member[]) ?? [])
    setInvites((inv.data as Invite[]) ?? [])
    const m = emptyMatrix()
    for (const row of perms.data ?? []) {
      if (row.role === 'planner' || row.role === 'helper' || row.role === 'viewer') {
        m[row.role][row.module as Module] = row.level as Level
      }
    }
    setMatrix(m)
  }, [supabase, wedding])

  React.useEffect(() => {
    void load()
  }, [load])

  if (!wedding) return null

  async function changeRole(member: Member, role: WeddingRole) {
    const { error } = await supabase
      .from('wedding_members')
      .update({ role })
      .eq('wedding_id', wedding!.id)
      .eq('user_id', member.user_id)
    if (error) {
      toast({ title: 'Kon rol niet wijzigen', description: error.message, variant: 'error' })
      return
    }
    toast({ title: 'Rol bijgewerkt' })
    void load()
  }

  async function confirmRemove() {
    if (!removeTarget) return
    const { error } = await supabase
      .from('wedding_members')
      .delete()
      .eq('wedding_id', wedding!.id)
      .eq('user_id', removeTarget.user_id)
    setRemoveTarget(null)
    if (error) {
      toast({ title: 'Kon lid niet verwijderen', description: error.message, variant: 'error' })
      return
    }
    toast({ title: 'Lid verwijderd' })
    void load()
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    const { data, error } = await supabase
      .from('wedding_invites')
      .insert({ wedding_id: wedding!.id, email: inviteEmail.trim(), role: inviteRole })
      .select('token')
      .single()
    if (error || !data) {
      setInviting(false)
      toast({ title: 'Uitnodigen mislukt', description: error?.message, variant: 'error' })
      return
    }
    const trimmedEmail = inviteEmail.trim()
    setInviteEmail('')
    const link = `${window.location.origin}/uitnodiging/${data.token}`
    await navigator.clipboard?.writeText(link).catch(() => {})

    let emailSent = false
    try {
      const res = await fetch('/api/email/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.token, email: trimmedEmail, role: inviteRole, weddingId: wedding!.id }),
      })
      const json = await res.json().catch(() => ({}))
      emailSent = json.emailSent === true
    } catch {
      // E-mail mislukt; klembord-fallback is al gedaan.
    }

    setInviting(false)
    if (emailSent) {
      toast({
        title: 'Uitnodiging verzonden',
        description: `De uitnodiging is naar ${trimmedEmail} gemaild. De link staat ook in je klembord als backup.`,
      })
    } else {
      toast({ title: 'Uitnodiging aangemaakt', description: 'De link is naar je klembord gekopieerd.' })
    }
    void load()
  }

  async function revokeInvite(id: string) {
    const { error } = await supabase.from('wedding_invites').delete().eq('id', id)
    if (error) {
      toast({ title: 'Intrekken mislukt', description: error.message, variant: 'error' })
      return
    }
    void load()
  }

  function copyInvite(token: string) {
    const link = `${window.location.origin}/uitnodiging/${token}`
    void navigator.clipboard?.writeText(link)
    toast({ title: 'Link gekopieerd' })
  }

  async function setCell(role: 'planner' | 'helper' | 'viewer', module: Module, level: Level) {
    const prev = matrix
    setMatrix({ ...matrix, [role]: { ...matrix[role], [module]: level } })
    const { error } = await supabase
      .from('wedding_role_permissions')
      .upsert(
        { wedding_id: wedding!.id, role, module, level },
        { onConflict: 'wedding_id,role,module' }
      )
    if (error) {
      setMatrix(prev)
      toast({ title: 'Kon recht niet opslaan', description: error.message, variant: 'error' })
    }
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
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titel="Leden & rechten"
        beschrijving="Nodig mensen uit om mee te plannen en bepaal per rol wat ze mogen zien en doen."
      />

      <div className="space-y-6">
        {/* Leden */}
        <Card>
          <CardHeader>
            <CardTitle>Leden</CardTitle>
            <CardDescription>Wie heeft toegang tot deze bruiloft.</CardDescription>
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
                  <div className="flex items-center gap-2">
                    <Select
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value as WeddingRole)}
                      className="w-40"
                      aria-label={`Rol van ${m.display_name || m.email}`}
                    >
                      <option value="owner">{ROLE_LABELS.owner}</option>
                      <option value="planner">{ROLE_LABELS.planner}</option>
                      <option value="helper">{ROLE_LABELS.helper}</option>
                      <option value="viewer">{ROLE_LABELS.viewer}</option>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Lid verwijderen"
                      onClick={() => setRemoveTarget(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Uitnodigen */}
        <Card>
          <CardHeader>
            <CardTitle>Iemand uitnodigen</CardTitle>
            <CardDescription>
              Maak een uitnodigingslink aan. Wie de link opent en inlogt, krijgt de gekozen rol.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={createInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="E-mailadres" htmlFor="invite-email" className="flex-1">
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="naam@voorbeeld.nl"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </Field>
              <Field label="Rol" htmlFor="invite-role" className="sm:w-44">
                <Select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WeddingRole)}
                >
                  <option value="planner">{ROLE_LABELS.planner}</option>
                  <option value="helper">{ROLE_LABELS.helper}</option>
                  <option value="viewer">{ROLE_LABELS.viewer}</option>
                </Select>
              </Field>
              <Button type="submit" loading={inviting}>
                <UserPlus className="h-4 w-4" />
                Uitnodigen
              </Button>
            </form>

            {invites.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Openstaande uitnodigingen
                </p>
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/50 px-4 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{inv.email}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {ROLE_LABELS[inv.role as WeddingRole] ?? inv.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyInvite(inv.token)}>
                        <Copy className="h-4 w-4" />
                        Kopieer link
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Uitnodiging intrekken"
                        onClick={() => revokeInvite(inv.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Rechten-matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Rechten per rol</CardTitle>
            <CardDescription>
              Bepaal per rol wat zichtbaar is. De eigenaar (bruidspaar) heeft altijd volledige toegang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-medium text-muted-foreground">Onderdeel</th>
                    <th className="px-2 py-2 font-medium text-muted-foreground">Eigenaar</th>
                    {EDITABLE_ROLES.map((role) => (
                      <th key={role} className="px-2 py-2 font-medium text-foreground" title={ROLE_DESCRIPTIONS[role]}>
                        {ROLE_LABELS[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((module) => (
                    <tr key={module} className="border-b border-border/60">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{MODULE_LABELS[module]}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">{LEVEL_LABELS.edit}</td>
                      {EDITABLE_ROLES.map((role) => (
                        <td key={role} className="px-2 py-2.5">
                          <Select
                            value={matrix[role][module]}
                            onChange={(e) => setCell(role, module, e.target.value as Level)}
                            className="w-28"
                            aria-label={`${ROLE_LABELS[role]} – ${MODULE_LABELS[module]}`}
                          >
                            <option value="none">{LEVEL_LABELS.none}</option>
                            <option value="view">{LEVEL_LABELS.view}</option>
                            <option value="edit">{LEVEL_LABELS.edit}</option>
                          </Select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        title="Lid verwijderen?"
        description={`Weet je zeker dat je ${removeTarget?.display_name || removeTarget?.email} de toegang wilt ontnemen?`}
        bevestigLabel="Verwijderen"
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
