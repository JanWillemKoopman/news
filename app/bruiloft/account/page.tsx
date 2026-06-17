'use client'

import { Bell, Camera, Check, KeyRound, Mail, Palette, Trash2, User } from 'lucide-react'
import Image from 'next/image'
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
  Label,
  useToast,
} from '@/components/bruiloft/ui'
import { ROLE_LABELS } from '@/lib/bruiloft/permissions'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useBruiloftStore, type DashboardTheme } from '@/store/bruiloftStore'

// ── Profielfoto ──────────────────────────────────────────────────────────────

function ProfielFotoSection() {
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const uploadAvatar = useBruiloftStore((s) => s.uploadAvatar)
  const updateProfile = useBruiloftStore((s) => s.updateProfile)
  const { toast } = useToast()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [imgError, setImgError] = React.useState(false)

  if (!currentUser) return null

  const initials = (currentUser.displayName || currentUser.email || '?')
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? '')
    .join('')

  const avatarSrc = preview ?? currentUser.avatarUrl ?? null

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Ongeldig bestandstype', description: 'Kies een JPG, PNG of WEBP afbeelding.', variant: 'error' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Bestand te groot', description: 'De maximale bestandsgrootte is 2 MB.', variant: 'error' })
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setImgError(false)
    setUploading(true)
    try {
      await uploadAvatar(file)
      toast({ title: 'Profielfoto opgeslagen' })
    } catch {
      setPreview(null)
      toast({ title: 'Upload mislukt', description: 'Probeer het later opnieuw.', variant: 'error' })
    } finally {
      setUploading(false)
      URL.revokeObjectURL(objectUrl)
    }
    e.target.value = ''
  }

  async function handleVerwijder() {
    setUploading(true)
    try {
      await updateProfile({ avatarUrl: null })
      setPreview(null)
      setImgError(false)
      toast({ title: 'Profielfoto verwijderd' })
    } catch {
      toast({ title: 'Verwijderen mislukt', variant: 'error' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          Profielfoto
        </CardTitle>
        <CardDescription>
          Wordt getoond in het hoofdmenu en bij taken waar je aan meewerkt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {avatarSrc && !imgError ? (
              <Image
                src={avatarSrc}
                alt="Profielfoto"
                width={80}
                height={80}
                onError={() => setImgError(true)}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground ring-2 ring-border">
                {initials}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {avatarSrc && !imgError ? 'Foto wijzigen' : 'Foto uploaden'}
            </Button>
            {(avatarSrc && !imgError) || currentUser.avatarUrl ? (
              <Button
                variant="ghost"
                size="sm"
                loading={uploading}
                onClick={handleVerwijder}
                className="text-muted-foreground"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Foto verwijderen
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">JPG, PNG of WEBP · max 2 MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Persoonlijke gegevens ────────────────────────────────────────────────────

function GegevensSection() {
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const updateProfile = useBruiloftStore((s) => s.updateProfile)
  const role = useBruiloftStore((s) => s.role)
  const { toast } = useToast()

  const splitName = React.useMemo(() => {
    const full = currentUser?.displayName ?? ''
    const idx = full.indexOf(' ')
    return idx === -1
      ? { voornaam: full, achternaam: '' }
      : { voornaam: full.slice(0, idx), achternaam: full.slice(idx + 1) }
  }, [currentUser?.displayName])

  const [voornaam, setVoornaam] = React.useState(splitName.voornaam)
  const [achternaam, setAchternaam] = React.useState(splitName.achternaam)
  const [email, setEmail] = React.useState(currentUser?.email ?? '')
  const [busy, setBusy] = React.useState(false)

  if (!currentUser) return null

  const emailGewijzigd = email.trim().toLowerCase() !== currentUser.email.toLowerCase()

  async function handleOpslaan(e: React.FormEvent) {
    e.preventDefault()
    const displayName = [voornaam.trim(), achternaam.trim()].filter(Boolean).join(' ')
    setBusy(true)
    try {
      await updateProfile({
        displayName,
        ...(emailGewijzigd && { email: email.trim() }),
      })
      if (emailGewijzigd) {
        toast({
          title: 'Verificatie-e-mail verzonden',
          description: 'Bevestig je nieuwe e-mailadres via de link in je inbox.',
        })
      } else {
        toast({ title: 'Gegevens opgeslagen' })
      }
    } catch (err) {
      toast({
        title: 'Opslaan mislukt',
        description: err instanceof Error ? err.message : 'Probeer het later opnieuw.',
        variant: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Persoonlijke gegevens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleOpslaan} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Voornaam" htmlFor="voornaam">
              <Input
                id="voornaam"
                value={voornaam}
                onChange={(e) => setVoornaam(e.target.value)}
                autoComplete="given-name"
              />
            </Field>
            <Field label="Achternaam" htmlFor="achternaam">
              <Input
                id="achternaam"
                value={achternaam}
                onChange={(e) => setAchternaam(e.target.value)}
                autoComplete="family-name"
              />
            </Field>
          </div>
          <Field
            label="E-mailadres"
            htmlFor="email"
          >
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {emailGewijzigd ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                Je ontvangt een verificatie-e-mail op het nieuwe adres.
              </p>
            ) : null}
          </Field>
          {role ? (
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">Mijn rol</p>
              <p className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</p>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" loading={busy}>
              Opslaan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Wachtwoord wijzigen ──────────────────────────────────────────────────────

function WachtwoordSection() {
  const { toast } = useToast()
  const [huidig, setHuidig] = React.useState('')
  const [nieuw, setNieuw] = React.useState('')
  const [bevestig, setBevestig] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const currentUser = useBruiloftStore((s) => s.currentUser)

  async function handleWijzig(e: React.FormEvent) {
    e.preventDefault()
    if (nieuw !== bevestig) {
      toast({ title: 'Wachtwoorden komen niet overeen', variant: 'error' })
      return
    }
    if (nieuw.length < 8) {
      toast({ title: 'Wachtwoord moet minimaal 8 tekens bevatten', variant: 'error' })
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser?.email ?? '',
        password: huidig,
      })
      if (signInError) {
        toast({ title: 'Huidig wachtwoord onjuist', variant: 'error' })
        return
      }
      const { error } = await supabase.auth.updateUser({ password: nieuw })
      if (error) throw error
      toast({ title: 'Wachtwoord gewijzigd' })
      setHuidig('')
      setNieuw('')
      setBevestig('')
    } catch (err) {
      toast({
        title: 'Wijzigen mislukt',
        description: err instanceof Error ? err.message : 'Probeer het later opnieuw.',
        variant: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          Wachtwoord wijzigen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleWijzig} className="space-y-4">
          <Field label="Huidig wachtwoord" htmlFor="huidig-pw">
            <Input
              id="huidig-pw"
              type="password"
              value={huidig}
              onChange={(e) => setHuidig(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Nieuw wachtwoord" htmlFor="nieuw-pw">
            <Input
              id="nieuw-pw"
              type="password"
              value={nieuw}
              onChange={(e) => setNieuw(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
          <Field label="Bevestig nieuw wachtwoord" htmlFor="bevestig-pw">
            <Input
              id="bevestig-pw"
              type="password"
              value={bevestig}
              onChange={(e) => setBevestig(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={busy}>
              Wachtwoord wijzigen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Herinneringen ────────────────────────────────────────────────────────────

function HerinneringenSection() {
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const updateProfile = useBruiloftStore((s) => s.updateProfile)
  const { toast } = useToast()
  const [saving, setSaving] = React.useState(false)

  if (!currentUser) return null
  const aan = currentUser.emailHerinneringen

  async function handleToggle() {
    setSaving(true)
    try {
      await updateProfile({ emailHerinneringen: !aan })
      toast({ title: aan ? 'Herinneringen uitgezet' : 'Herinneringen aangezet' })
    } catch (err) {
      toast({
        title: 'Opslaan mislukt',
        description: err instanceof Error ? err.message : 'Probeer het later opnieuw.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Herinneringen
        </CardTitle>
        <CardDescription>
          Ontvang automatisch een e-mail vóór een taak-deadline of betaaltermijn.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">E-mailherinneringen</p>
            <p className="text-sm text-muted-foreground">
              {aan
                ? 'Staan aan — je krijgt op tijd een seintje.'
                : 'Staan uit — je ontvangt geen herinneringen.'}
            </p>
          </div>
          <Button variant="outline" loading={saving} onClick={handleToggle}>
            {aan ? 'Uitzetten' : 'Aanzetten'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Dashboardthema ───────────────────────────────────────────────────────────

const THEMES: {
  id: DashboardTheme
  label: string
  beschrijving: string
  // Twee stalen: [achtergrondkleur, accentkleur]
  stalen: [string, string]
}[] = [
  {
    id: 'standaard',
    label: 'Standaard',
    beschrijving: 'Wit canvas met dusty-rose accent en donkerblauwe navigatie.',
    stalen: ['#f4f4f5', '#a75573'],
  },
  {
    id: 'dark',
    label: 'Dark',
    beschrijving: 'Donker blauwleisten met levendige rose accent — rustiger op het oog.',
    stalen: ['#161e2b', '#be3769'],
  },
  {
    id: 'roze',
    label: 'Roze',
    beschrijving: 'Zachte blushroos canvas met diep rose accent en berry navigatie.',
    stalen: ['#faf4f7', '#b12554'],
  },
  {
    id: 'paars',
    label: 'Paars',
    beschrijving: 'Haast wit met lavendelaanslag en een diep violet accent.',
    stalen: ['#f8f5fa', '#6b25b1'],
  },
]

function ThemeSwitcherSection() {
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const updateProfile = useBruiloftStore((s) => s.updateProfile)
  const { toast } = useToast()
  const [saving, setSaving] = React.useState<DashboardTheme | null>(null)

  if (!currentUser) return null
  const huidig = currentUser.dashboardTheme

  async function handleKies(theme: DashboardTheme) {
    if (theme === huidig || saving) return
    setSaving(theme)
    try {
      await updateProfile({ dashboardTheme: theme })
      toast({ title: 'Thema opgeslagen' })
    } catch {
      toast({ title: 'Opslaan mislukt', variant: 'error' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          Dashboardthema
        </CardTitle>
        <CardDescription>
          Kies een kleursfeer voor jouw dashboard. De keuze wordt per apparaat direct toegepast.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((t) => {
            const actief = t.id === huidig
            const bezig = saving === t.id
            return (
              <button
                key={t.id}
                type="button"
                disabled={!!saving}
                onClick={() => handleKies(t.id)}
                aria-pressed={actief}
                title={t.beschrijving}
                className={cn(
                  'group relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait',
                  actief
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                )}
              >
                {/* Kleurstaal */}
                <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                  <span className="h-full w-1/2" style={{ background: t.stalen[0] }} />
                  <span className="h-full w-1/2" style={{ background: t.stalen[1] }} />
                </span>
                <span className="text-xs font-medium text-foreground">{t.label}</span>
                {actief && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
                {bezig && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-[6px] bg-background/60">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Gevaarzone ───────────────────────────────────────────────────────────────

function GevaarZoneSection() {
  const router = useRouter()
  const signOut = useBruiloftStore((s) => s.signOut)
  const { toast } = useToast()
  const [confirm, setConfirm] = React.useState(false)
  const [wachtwoord, setWachtwoord] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  function openConfirm() {
    setWachtwoord('')
    setConfirm(true)
  }

  async function deleteAccount() {
    if (!wachtwoord) return
    setBusy(true)
    const res = await fetch('/account/verwijderen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wachtwoord }),
    })
    if (!res.ok) {
      setBusy(false)
      const data = await res.json().catch(() => ({}))
      const msg = data.error === 'Onjuist wachtwoord'
        ? 'Onjuist wachtwoord. Probeer opnieuw.'
        : 'Verwijderen mislukt. Probeer het later opnieuw.'
      toast({ title: msg, variant: 'error' })
      return
    }
    await signOut()
    router.push('/inloggen')
    router.refresh()
  }

  return (
    <>
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
          <Button variant="destructive" onClick={openConfirm} loading={busy}>
            Account verwijderen
          </Button>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => { if (!o) { setConfirm(false); setWachtwoord('') } }}
        title="Account definitief verwijderen?"
        description="Voer je wachtwoord in ter bevestiging. Je account en de bruiloften waarvan jij de enige eigenaar bent worden permanent verwijderd."
        bevestigLabel="Ja, verwijder mijn account"
        onConfirm={deleteAccount}
      >
        <Input
          type="password"
          placeholder="Jouw wachtwoord"
          autoComplete="current-password"
          value={wachtwoord}
          onChange={(e) => setWachtwoord(e.target.value)}
          className="mb-4"
        />
      </ConfirmDialog>
    </>
  )
}

// ── Paginahoofd met avatar-hero ───────────────────────────────────────────────

function AccountHero() {
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const role = useBruiloftStore((s) => s.role)
  const [imgError, setImgError] = React.useState(false)
  if (!currentUser) return null

  const initials = (currentUser.displayName || currentUser.email || '?')
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="mb-8 flex items-center gap-4">
      {currentUser.avatarUrl && !imgError ? (
        <Image
          src={currentUser.avatarUrl}
          alt="Profielfoto"
          width={64}
          height={64}
          onError={() => setImgError(true)}
          className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
        />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground ring-2 ring-border">
          {initials}
        </span>
      )}
      <div>
        <h1 className="text-2xl text-foreground">
          {currentUser.displayName || currentUser.email}
        </h1>
        {/* Zonder ingestelde naam staat het e-mailadres al in de kop; toon dan een hint. */}
        {currentUser.displayName ? (
          <p className="text-sm text-muted-foreground">{currentUser.email}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Stel hieronder je naam in</p>
        )}
        {role ? (
          <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {ROLE_LABELS[role]}
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ── Hoofdpagina ───────────────────────────────────────────────────────────────

export default function AccountPage() {
  const currentUser = useBruiloftStore((s) => s.currentUser)
  if (!currentUser) return null

  return (
    <div className="mx-auto max-w-2xl pb-24 min-h-screen">
      <PageHeader titel="Account" beschrijving="Beheer je profiel en accountinstellingen." />
      <AccountHero />
      <ProfielFotoSection />
      <GegevensSection />
      <HerinneringenSection />
      <ThemeSwitcherSection />
      <WachtwoordSection />
      <hr className="my-4 border-border" />
      <GevaarZoneSection />
    </div>
  )
}
