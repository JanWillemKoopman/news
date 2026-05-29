'use client'

import { Camera, KeyRound, Mail, ShieldCheck, Trash2, User } from 'lucide-react'
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
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/bruiloft/permissions'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useBruiloftStore } from '@/store/bruiloftStore'

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
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-600 text-2xl font-semibold text-white ring-2 ring-border">
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

// ── Mijn rol ─────────────────────────────────────────────────────────────────

function MijnRolSection() {
  const role = useBruiloftStore((s) => s.role)
  if (!role) return null
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Mijn rol
        </CardTitle>
        <CardDescription>
          Je rol bepaalt wat je kunt zien en bewerken binnen deze bruiloft.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700">
            {ROLE_LABELS[role]}
          </span>
          <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
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
  const [busy, setBusy] = React.useState(false)

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
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-xl font-semibold text-white ring-2 ring-border">
          {initials}
        </span>
      )}
      <div>
        <h1 className="font-serif text-2xl text-foreground">
          {currentUser.displayName || currentUser.email}
        </h1>
        <p className="text-sm text-muted-foreground">{currentUser.email}</p>
        {role ? (
          <span className="mt-1 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
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
    <div className="mx-auto max-w-2xl">
      <PageHeader titel="Account" beschrijving="Beheer je profiel en accountinstellingen." />
      <AccountHero />
      <ProfielFotoSection />
      <GegevensSection />
      <WachtwoordSection />
      <MijnRolSection />
      <GevaarZoneSection />
    </div>
  )
}
