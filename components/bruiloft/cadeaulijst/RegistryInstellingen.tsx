'use client'

import * as React from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'

import { useBruiloftStore } from '@/store/bruiloftStore'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Textarea,
  useToast,
} from '@/components/bruiloft/ui'

export function RegistryInstellingen() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const registrySettings = useBruiloftStore((s) => s.registrySettings)
  const saveRegistrySettings = useBruiloftStore((s) => s.saveRegistrySettings)
  const { toast } = useToast()

  const [isEnabled, setIsEnabled] = React.useState(false)
  const [introText, setIntroText] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [iban, setIban] = React.useState('')
  const [accountName, setAccountName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    setIsEnabled(registrySettings?.isEnabled ?? false)
    setIntroText(registrySettings?.introText ?? '')
    setPassword(registrySettings?.password ?? '')
    setIban(registrySettings?.bankAccountIban ?? '')
    setAccountName(registrySettings?.bankAccountName ?? '')
  }, [registrySettings])

  const slug = websiteContent?.slug
  const registryUrl = slug
    ? `${(process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')}/trouwen/${slug}/cadeaulijst`
    : null

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveRegistrySettings({
        isEnabled,
        introText,
        password,
        bankAccountIban: iban,
        bankAccountName: accountName,
      })
      toast({ title: 'Instellingen opgeslagen', variant: 'success' })
    } catch {
      toast({ title: 'Opslaan mislukt', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const copyLink = async () => {
    if (!registryUrl) return
    await navigator.clipboard.writeText(registryUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whatsappMsg = registryUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Bekijk onze cadeaulijst: ${registryUrl}`)}`
    : null

  return (
    <div className="space-y-6">
      {/* Zichtbaarheid */}
      <Card>
        <CardHeader>
          <CardTitle>Zichtbaarheid</CardTitle>
          <CardDescription>Bepaal of gasten de cadeaulijst kunnen zien op jullie trouwwebsite.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              role="switch"
              aria-checked={isEnabled}
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isEnabled ? 'bg-rose-600' : 'bg-muted'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-foreground">
              Cadeaulijst tonen op trouwwebsite
            </span>
          </label>

          <Field label="Welkomsttekst (boven de lijst)">
            <Textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              rows={4}
              placeholder="Jullie aanwezigheid is ons mooiste cadeau. Maar voor wie toch iets wil geven..."
            />
          </Field>

          <Field label="Wachtwoord voor gasten (optioneel)">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              placeholder="Laat leeg als iedereen met de link de lijst kan zien"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Laat leeg als iedereen met de link de lijst kan zien.
            </p>
          </Field>
        </CardContent>
      </Card>

      {/* Betaalinstellingen */}
      <Card>
        <CardHeader>
          <CardTitle>Betaalinstellingen</CardTitle>
          <CardDescription>Gasten zien dit IBAN als ze willen bijdragen aan een geldfonds. Je kunt ook per fonds een aparte betaallink (Tikkie etc.) instellen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="IBAN-rekeningnummer">
            <Input
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="NL00 BANK 0000 0000 00"
            />
          </Field>
          <Field label="Rekeninghouder">
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={`${wedding?.partner1Naam ?? ''} & ${wedding?.partner2Naam ?? ''}`}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Deelknop */}
      {registryUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Deel de cadeaulijst</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <span className="flex-1 truncate text-muted-foreground">{registryUrl}</span>
              <button onClick={copyLink} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Kopieer link">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyLink} className="flex-1">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Gekopieerd!' : 'Kopieer link'}
              </Button>
              {whatsappMsg && (
                <a
                  href={whatsappMsg}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-whatsapp px-4 py-2 text-sm font-semibold text-white hover:bg-whatsapp/90 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" /> Deel via WhatsApp
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          Instellingen opslaan
        </Button>
      </div>
    </div>
  )
}
