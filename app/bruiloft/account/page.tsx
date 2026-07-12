'use client'

import { Bell, Calendar, Camera, Check, Copy, KeyRound, Link2, Mail, Trash2, User } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { AppleIcon, GoogleIcon, OutlookIcon } from '@/components/bruiloft/icons/BrandIcons'
import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { accountInfo } from '@/components/bruiloft/faqContent'
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
import { PasswordInput } from '@/components/ui/password-input'
import { ROLE_LABELS } from '@/lib/bruiloft/permissions'
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
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-white ring-2 ring-border">
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
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
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
            <PasswordInput
              id="huidig-pw"
              value={huidig}
              onChange={(e) => setHuidig(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Nieuw wachtwoord" htmlFor="nieuw-pw">
            <PasswordInput
              id="nieuw-pw"
              value={nieuw}
              onChange={(e) => setNieuw(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>
          <Field label="Bevestig nieuw wachtwoord" htmlFor="bevestig-pw">
            <PasswordInput
              id="bevestig-pw"
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

// ── Agenda synchroniseren ────────────────────────────────────────────────────

function AgendaSynchroniserenSection() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const share = useBruiloftStore((s) => s.agendaShare)
  const enableAgendaShare = useBruiloftStore((s) => s.enableAgendaShare)
  const disableAgendaShare = useBruiloftStore((s) => s.disableAgendaShare)
  const { toast } = useToast()

  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => { setOrigin(window.location.origin) }, [])

  const [busy, setBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  if (!wedding) return null

  const httpsUrl = share && origin ? `${origin}/api/agenda/${share.token}.ics` : null
  // webcal:// opent op iPhone/Mac (en in Outlook) direct het abonneer-scherm.
  const webcalUrl = httpsUrl ? httpsUrl.replace(/^https?:\/\//, 'webcal://') : null
  const googleUrl = webcalUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
    : null

  async function zetAan() {
    setBusy(true)
    try {
      await enableAgendaShare()
      toast({ title: 'Agenda-koppeling aangezet' })
    } catch {
      toast({ title: 'Koppeling aanzetten mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function zetUit() {
    setBusy(true)
    try {
      await disableAgendaShare()
      toast({
        title: 'Koppeling gestopt',
        description: 'De agenda ontvangt geen updates meer. Opnieuw koppelen geeft een nieuwe link.',
      })
    } catch {
      toast({ title: 'Stoppen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!httpsUrl) return
    try {
      await navigator.clipboard.writeText(httpsUrl)
      setCopied(true)
      toast({ title: 'Link gekopieerd', description: 'Plak hem in je agenda-app bij "abonneren via URL".' })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Geef toegang tot het klembord en probeer opnieuw.', variant: 'error' })
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Agenda synchroniseren
        </CardTitle>
        <CardDescription>
          Je krijgt een persoonlijke agenda-link (een &ldquo;abonnement&rdquo;). Daarmee verschijnen de
          trouwdag, leveranciersafspraken, taak-deadlines en betaaltermijnen automatisch in je
          eigen agenda-app — en blijven ze vanzelf actueel als er in de app iets wijzigt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {share ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              De koppeling staat aan. Kies hieronder je agenda-app om je te abonneren. Het kan bij
              sommige agenda-apps een paar uur duren voordat een wijziging zichtbaar is. De link
              werkt ook voor de agenda van je partner.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {googleUrl ? (
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border px-2 py-3 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <GoogleIcon className="h-5 w-5" />
                  Google
                </a>
              ) : null}
              {webcalUrl ? (
                <a
                  href={webcalUrl}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border px-2 py-3 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <AppleIcon className="h-5 w-5" />
                  Apple
                </a>
              ) : null}
              {webcalUrl ? (
                <a
                  href={webcalUrl}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border px-2 py-3 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <OutlookIcon className="h-5 w-5" />
                  Outlook
                </a>
              ) : null}
            </div>
            {httpsUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{httpsUrl}</span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Kopieer link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={zetUit} loading={busy}>
                Koppeling stoppen
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nog niet gekoppeld. Zet &apos;m aan om de link te krijgen voor Google Agenda, Apple Agenda
              of Outlook. Stoppen kan altijd — de link werkt dan direct niet meer.
            </p>
            <Button variant="outline" onClick={zetAan} loading={busy}>
              Agenda-koppeling aanzetten
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Gevaarzone ───────────────────────────────────────────────────────────────

// Alleen eigenaren kunnen de bruiloft verwijderen. Dit blok stond eerder op
// "Samen plannen", maar hoort bij de gevaarzone naast account-verwijderen.
const BRUILOFT_BEVESTIG_ZIN = 'Verwijder mijn bruiloft'

function BruiloftVerwijderenSection() {
  const router = useRouter()
  const wedding = useBruiloftStore((s) => s.wedding)
  const role = useBruiloftStore((s) => s.role)
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const deleteActiveWedding = useBruiloftStore((s) => s.deleteActiveWedding)
  const { toast } = useToast()
  const [confirm, setConfirm] = React.useState(false)
  const [bevestiging, setBevestiging] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  if (!wedding || role !== 'owner') return null

  function openConfirm() {
    setBevestiging('')
    setConfirm(true)
  }

  async function onDelete() {
    if (!bevestiging) return
    setBusy(true)
    try {
      if (bevestiging.trim() !== BRUILOFT_BEVESTIG_ZIN) {
        const supabase = createClient()
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser?.email ?? '',
          password: bevestiging,
        })
        if (signInError) {
          setBusy(false)
          toast({ title: 'Onjuist wachtwoord of bevestigingszin', variant: 'error' })
          return
        }
      }
      await deleteActiveWedding()
      router.push('/bruiloft')
      router.refresh()
    } catch {
      setBusy(false)
      toast({ title: 'Verwijderen mislukt', description: 'Probeer het later opnieuw.', variant: 'error' })
    }
  }

  return (
    <>
      <Card className="mb-6 border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Bruiloft verwijderen</CardTitle>
          <CardDescription>
            Verwijder alleen deze bruiloft en alle bijbehorende gegevens (gasten, taken, budget,
            leveranciers, draaiboek, tafels en website) — je account zelf blijft bestaan. Dit kan
            niet ongedaan worden gemaakt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={openConfirm} loading={busy}>
            Bruiloft verwijderen
          </Button>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirm}
        onOpenChange={(o) => { if (!o) { setConfirm(false); setBevestiging('') } }}
        title="Bruiloft definitief verwijderen?"
        description={`Alle gegevens van "${wedding.partner1Naam} & ${wedding.partner2Naam}" worden permanent verwijderd.`}
        bevestigLabel="Ja, verwijder bruiloft"
        onConfirm={onDelete}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Vul je wachtwoord in, of typ{' '}
          <span className="font-medium text-foreground">&ldquo;{BRUILOFT_BEVESTIG_ZIN}&rdquo;</span>{' '}
          om te bevestigen.
        </p>
        <Input
          placeholder={`Wachtwoord of "${BRUILOFT_BEVESTIG_ZIN}"`}
          value={bevestiging}
          onChange={(e) => setBevestiging(e.target.value)}
          autoComplete="off"
          className="mb-4"
        />
      </ConfirmDialog>
    </>
  )
}

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
            Dit verwijdert je hele account en inlog definitief, inclusief alle bruiloften waarvan
            jij de enige eigenaar bent. Wil je alleen déze bruiloft kwijt en je account houden?
            Gebruik hierboven &ldquo;Bruiloft verwijderen&rdquo;. Dit kan niet ongedaan worden
            gemaakt.
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
        <PasswordInput
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
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-white ring-2 ring-border">
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
    <div className="mx-auto max-w-2xl pb-24 min-h-screen">
      <PageHeader titel="Account" info={<PageInfoButton {...accountInfo} />} />
      <AccountHero />
      <ProfielFotoSection />
      <GegevensSection />
      <HerinneringenSection />
      <AgendaSynchroniserenSection />
      <WachtwoordSection />
      <hr className="my-4 border-border" />
      <BruiloftVerwijderenSection />
      <GevaarZoneSection />
    </div>
  )
}
