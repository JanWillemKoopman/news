'use client'

import { Mail, ShieldCheck, Trash2, UserPlus, UserCog } from 'lucide-react'
import * as React from 'react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { ledenInfo } from '@/components/bruiloft/faqContent'
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
  Modal,
  OverflowMenu,
  SegmentedControl,
  Select,
  useToast,
} from '@/components/bruiloft/ui'
import type { OverflowMenuItem } from '@/components/bruiloft/ui'
import {
  EDITABLE_ROLES,
  LEVEL_LABELS,
  MODULES,
  MODULE_DESCRIPTIONS,
  MODULE_LABELS,
  ROLE_LABELS,
  ROLE_SUMMARIES,
  type EditableRole,
  type Level,
  type Module,
  type WeddingRole,
} from '@/lib/bruiloft/permissions'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useBruiloftStore } from '@/store/bruiloftStore'

type Member = { user_id: string; email: string | null; display_name: string | null; role: string }

const ALL_ROLES: WeddingRole[] = ['owner', 'planner', 'helper', 'viewer']

// Rechten per rol per module, zoals opgeslagen in wedding_role_permissions.
type MatrixState = Record<EditableRole, Partial<Record<Module, Level>>>

const EMPTY_MATRIX: MatrixState = { planner: {}, helper: {}, viewer: {} }

// ── Rolkeuze (radio-kaartjes, gedeeld door uitnodigen & rol wijzigen) ─────────

function RolKeuze({
  value,
  onChange,
  idPrefix,
}: {
  value: WeddingRole | null
  onChange: (r: WeddingRole) => void
  idPrefix: string
}) {
  return (
    <div role="radiogroup" aria-label="Rol" className="space-y-2">
      {ALL_ROLES.map((r) => {
        const actief = value === r
        return (
          <label
            key={r}
            htmlFor={`${idPrefix}-${r}`}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
              actief ? 'border-foreground/40 bg-muted' : 'border-border hover:bg-muted/50'
            )}
          >
            <input
              type="radio"
              id={`${idPrefix}-${r}`}
              name={`${idPrefix}-rol`}
              value={r}
              checked={actief}
              onChange={() => onChange(r)}
              className="mt-1 h-4 w-4 accent-foreground"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{ROLE_LABELS[r]}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {ROLE_SUMMARIES[r]}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

// ── Hoofdpagina ───────────────────────────────────────────────────────────────

export default function SamenPlannenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const role = useBruiloftStore((s) => s.role)
  const { toast } = useToast()
  const supabase = React.useMemo(() => createClient(), [])
  const isOwner = role === 'owner'

  const [members, setMembers] = React.useState<Member[]>([])
  const [statuses, setStatuses] = React.useState<Record<string, { activated: boolean }>>({})
  const [matrix, setMatrix] = React.useState<MatrixState>(EMPTY_MATRIX)
  const [matrixRol, setMatrixRol] = React.useState<EditableRole>('planner')

  // Uitnodigen
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRol, setInviteRol] = React.useState<WeddingRole | null>(null)
  const [inviting, setInviting] = React.useState(false)

  // Rol wijzigen / verwijderen / opnieuw versturen
  const [roleTarget, setRoleTarget] = React.useState<Member | null>(null)
  const [roleKeuze, setRoleKeuze] = React.useState<WeddingRole | null>(null)
  const [roleBusy, setRoleBusy] = React.useState(false)
  const [removeTarget, setRemoveTarget] = React.useState<Member | null>(null)
  const [resending, setResending] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!wedding) return
    const { data } = await supabase.rpc('list_wedding_members', { p_wedding: wedding.id })
    setMembers((data as Member[]) ?? [])
    // Activatiestatus is alleen voor de eigenaar beschikbaar (admin-only API).
    if (role === 'owner') {
      try {
        const res = await fetch(`/api/partner/status?weddingId=${wedding.id}`)
        if (res.ok) {
          const json = await res.json()
          setStatuses(json.statuses ?? {})
        }
      } catch {
        // Statuslabels zijn optioneel; bij een fout tonen we ze gewoon niet.
      }
    }
  }, [supabase, wedding, role])

  const loadMatrix = React.useCallback(async () => {
    if (!wedding) return
    const { data } = await supabase
      .from('wedding_role_permissions')
      .select('role, module, level')
      .eq('wedding_id', wedding.id)
    const next: MatrixState = { planner: {}, helper: {}, viewer: {} }
    for (const r of data ?? []) {
      const rol = r.role as EditableRole
      if (next[rol]) next[rol][r.module as Module] = r.level as Level
    }
    setMatrix(next)
  }, [supabase, wedding])

  React.useEffect(() => {
    void load()
    void loadMatrix()
  }, [load, loadMatrix])

  if (!wedding) return null

  // ── Acties ──────────────────────────────────────────────────────────────────

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteRol) {
      toast({ title: 'Kies eerst een rol', description: 'Elke genodigde krijgt een rol die bepaalt wat diegene kan.', variant: 'error' })
      return
    }
    setInviting(true)
    try {
      const res = await fetch('/api/member/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding!.id, email: inviteEmail.trim(), role: inviteRol }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Uitnodigen mislukt', description: json.error, variant: 'error' })
        return
      }
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRol(null)
      toast({
        title: 'Uitnodiging verstuurd',
        description: json.emailSent
          ? `${inviteEmail.trim()} ontvangt een e-mail om een wachtwoord in te stellen.`
          : 'Het lid is toegevoegd, maar de e-mail kon niet verzonden worden. Verstuur de uitnodiging later opnieuw.',
      })
      void load()
    } catch {
      toast({ title: 'Uitnodigen mislukt', description: 'Probeer het later opnieuw.', variant: 'error' })
    } finally {
      setInviting(false)
    }
  }

  function openRoleModal(m: Member) {
    setRoleTarget(m)
    setRoleKeuze(m.role as WeddingRole)
  }

  async function submitRoleChange(e: React.FormEvent) {
    e.preventDefault()
    if (!roleTarget || !roleKeuze || roleKeuze === roleTarget.role) {
      setRoleTarget(null)
      return
    }
    setRoleBusy(true)
    const { error } = await supabase
      .from('wedding_members')
      .update({ role: roleKeuze })
      .eq('wedding_id', wedding!.id)
      .eq('user_id', roleTarget.user_id)
    setRoleBusy(false)
    if (error) {
      // De database bewaakt o.a. dat er altijd minstens één eigenaar blijft.
      toast({ title: 'Rol wijzigen mislukt', description: error.message, variant: 'error' })
      return
    }
    toast({
      title: 'Rol gewijzigd',
      description: `${roleTarget.display_name || roleTarget.email} is nu ${ROLE_LABELS[roleKeuze].toLowerCase()}.`,
    })
    setRoleTarget(null)
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
      toast({ title: 'Kon toegang niet intrekken', description: error.message, variant: 'error' })
      return
    }
    toast({ title: 'Toegang ingetrokken' })
    void load()
  }

  async function resend(m: Member) {
    setResending(m.user_id)
    try {
      const res = await fetch('/api/partner/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding!.id, userId: m.user_id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Versturen mislukt', description: json.error, variant: 'error' })
        return
      }
      toast({
        title: 'E-mail opnieuw verstuurd',
        description: json.emailSent
          ? `${m.email} ontvangt opnieuw een link om een wachtwoord in te stellen.`
          : 'De e-mail kon niet verzonden worden. Probeer het later opnieuw.',
      })
    } catch {
      toast({ title: 'Versturen mislukt', description: 'Probeer het later opnieuw.', variant: 'error' })
    } finally {
      setResending(null)
    }
  }

  async function setLevel(module: Module, level: Level) {
    const vorige = matrix[matrixRol][module]
    // Optimistisch bijwerken; bij een fout draaien we terug.
    setMatrix((m) => ({ ...m, [matrixRol]: { ...m[matrixRol], [module]: level } }))
    const { error } = await supabase
      .from('wedding_role_permissions')
      .upsert(
        { wedding_id: wedding!.id, role: matrixRol, module, level },
        { onConflict: 'wedding_id,role,module' }
      )
    if (error) {
      setMatrix((m) => ({ ...m, [matrixRol]: { ...m[matrixRol], [module]: vorige } }))
      toast({ title: 'Opslaan mislukt', description: error.message, variant: 'error' })
      return
    }
    toast({
      title: 'Rechten bijgewerkt',
      description: `${ROLE_LABELS[matrixRol]} · ${MODULE_LABELS[module]}: ${LEVEL_LABELS[level].toLowerCase()}.`,
    })
  }

  // ── Weergave ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl pb-24 min-h-screen">
      <PageHeader
        titel="Samen plannen"
        primaryActie={
          isOwner ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Lid uitnodigen
            </Button>
          ) : undefined
        }
        info={<PageInfoButton {...ledenInfo} />}
      />

      <div className="space-y-6">
        {/* Wie heeft toegang */}
        <Card>
          <CardHeader>
            <CardTitle>Wie heeft toegang</CardTitle>
            <CardDescription>
              {isOwner
                ? 'Iedereen hier werkt mee aan het trouwplan. Nodig leden uit, wijzig hun rol of trek toegang in.'
                : 'Iedereen hier werkt mee aan het trouwplan. Alleen eigenaren kunnen leden beheren; jij kijkt mee.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => {
              const isSelf = m.user_id === currentUser?.id
              const nietGeactiveerd = isOwner && !isSelf && statuses[m.user_id]?.activated === false
              const acties: OverflowMenuItem[] = []
              if (isOwner && !isSelf) {
                acties.push({ label: 'Rol wijzigen', icon: UserCog, onClick: () => openRoleModal(m) })
                if (nietGeactiveerd) {
                  acties.push({
                    label: 'Uitnodiging opnieuw versturen',
                    icon: Mail,
                    disabled: resending === m.user_id,
                    onClick: () => void resend(m),
                  })
                }
                acties.push({
                  label: 'Toegang intrekken',
                  icon: Trash2,
                  danger: true,
                  onClick: () => setRemoveTarget(m),
                })
              }
              return (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {m.display_name || m.email || 'Onbekend'}
                      {isSelf ? <span className="ml-1 font-normal text-muted-foreground">(jij)</span> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ROLE_LABELS[m.role as WeddingRole] ?? m.role}
                      {m.email ? ` · ${m.email}` : ''}
                      {nietGeactiveerd ? (
                        <span className="text-rose-700"> · nog niet geactiveerd</span>
                      ) : null}
                    </p>
                  </div>
                  {acties.length > 0 ? <OverflowMenu items={acties} label={`Beheer ${m.display_name || m.email}`} /> : null}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Rollen en rechten */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Rollen en rechten
            </CardTitle>
            <CardDescription>
              {isOwner
                ? 'Eigenaren zien en bewerken altijd alles. Voor de andere rollen bepaal jij per onderdeel wat ze kunnen.'
                : 'Eigenaren zien en bewerken altijd alles. De eigenaar bepaalt per onderdeel wat de andere rollen kunnen.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wat de rollen betekenen */}
            <div className="space-y-3">
              {ALL_ROLES.map((r) => (
                <div key={r}>
                  <p className="text-sm font-medium text-foreground">{ROLE_LABELS[r]}</p>
                  <p className="text-sm text-muted-foreground">{ROLE_SUMMARIES[r]}</p>
                </div>
              ))}
            </div>

            <hr className="border-border" />

            {/* Rechten per onderdeel */}
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-foreground">Rechten per onderdeel</p>
                <SegmentedControl
                  waarde={matrixRol}
                  onChange={setMatrixRol}
                  ariaLabel="Rol om rechten van te bekijken"
                  opties={EDITABLE_ROLES.map((r) => ({ waarde: r, label: ROLE_LABELS[r] }))}
                />
              </div>
              <div className="mt-4 space-y-1">
                {MODULES.map((module) => {
                  const level: Level = matrix[matrixRol][module] ?? 'none'
                  return (
                    <div
                      key={module}
                      className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{MODULE_LABELS[module]}</p>
                        <p className="hidden text-xs text-muted-foreground sm:block">
                          {MODULE_DESCRIPTIONS[module]}
                        </p>
                      </div>
                      {isOwner ? (
                        <Select
                          value={level}
                          onChange={(e) => void setLevel(module, e.target.value as Level)}
                          aria-label={`${MODULE_LABELS[module]} voor ${ROLE_LABELS[matrixRol]}`}
                          className="w-32 shrink-0"
                        >
                          {(['none', 'view', 'edit'] as Level[]).map((l) => (
                            <option key={l} value={l}>
                              {LEVEL_LABELS[l]}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <span className="shrink-0 text-sm text-muted-foreground">{LEVEL_LABELS[level]}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Leden uitnodigen, rollen wijzigen en toegang intrekken kan altijd alleen de eigenaar,
                ongeacht deze instellingen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lid uitnodigen */}
      <Modal
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o)
          if (!o) {
            setInviteEmail('')
            setInviteRol(null)
          }
        }}
        title="Lid uitnodigen"
        description="Diegene ontvangt een e-mail met een knop om een wachtwoord in te stellen en krijgt direct toegang."
      >
        <form onSubmit={submitInvite} className="space-y-4">
          <Field label="E-mailadres" htmlFor="invite-email" required>
            <Input
              id="invite-email"
              type="email"
              required
              placeholder="naam@voorbeeld.nl"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </Field>
          <Field label="Rol" required>
            <RolKeuze value={inviteRol} onChange={setInviteRol} idPrefix="invite" />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" loading={inviting} disabled={!inviteRol}>
              <Mail className="h-4 w-4" />
              Uitnodiging versturen
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rol wijzigen */}
      <Modal
        open={!!roleTarget}
        onOpenChange={(o) => !o && setRoleTarget(null)}
        title="Rol wijzigen"
        description={
          roleTarget
            ? `Kies de nieuwe rol van ${roleTarget.display_name || roleTarget.email}.`
            : undefined
        }
      >
        <form onSubmit={submitRoleChange} className="space-y-4">
          <RolKeuze value={roleKeuze} onChange={setRoleKeuze} idPrefix="rolwijzig" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setRoleTarget(null)}>
              Annuleren
            </Button>
            <Button type="submit" loading={roleBusy} disabled={!roleKeuze || roleKeuze === roleTarget?.role}>
              Rol opslaan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Toegang intrekken?"
        description={`${removeTarget?.display_name || removeTarget?.email} verliest direct de toegang tot dit trouwplan. Je kunt diegene later opnieuw uitnodigen.`}
        bevestigLabel="Intrekken"
        onConfirm={confirmRemove}
      />
    </div>
  )
}
