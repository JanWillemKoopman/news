'use client'

import * as React from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Lock,
  PiggyBank,
  ShoppingBag,
} from 'lucide-react'

import type { PublicRegistryData, PublicRegistryItem } from '@/lib/bruiloft/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEuro(cents: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

// ─── Password gate ─────────────────────────────────────────────────────────────

function PasswordGate({ slug, onUnlocked }: { slug: string; onUnlocked: () => void }) {
  const [pw, setPw] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/registry/check-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password: pw }),
      })
      const json = await res.json() as { ok: boolean }
      if (json.ok) {
        sessionStorage.setItem(`registry_unlocked_${slug}`, '1')
        onUnlocked()
      } else {
        setError('Onjuist wachtwoord. Probeer het opnieuw.')
      }
    } catch {
      setError('Controleer je verbinding en probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'hsl(var(--primary)/0.1)' }}>
        <Lock className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
      </div>
      <h3 className="mb-1 text-lg font-semibold">Cadeaulijst beveiligd</h3>
      <p className="mb-6 text-sm text-muted-foreground">Voer het wachtwoord in om de lijst te bekijken.</p>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Wachtwoord"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          autoComplete="off"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pw}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ background: 'hsl(var(--primary))' }}
        >
          {loading ? 'Controleren…' : 'Bekijken'}
        </button>
      </form>
    </div>
  )
}

// ─── Gift item ─────────────────────────────────────────────────────────────────

function GiftItem({ item, slug }: { item: PublicRegistryItem; slug: string }) {
  const [expanded, setExpanded] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/registry/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, guest_name: name, guest_email: email, message, wedding_slug: slug }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        setError(json.error ?? 'Er ging iets mis. Probeer opnieuw.')
        return
      }
      setDone(true)
    } catch {
      setError('Controleer je verbinding en probeer opnieuw.')
    } finally {
      setSubmitting(false)
    }
  }

  if (item.isReserved) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm opacity-75">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover grayscale" />
        )}
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground">{item.title}</h3>
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              ✓ Gereserveerd
            </span>
          </div>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover" />
      )}
      {!item.imageUrl && (
        <div className="flex h-32 items-center justify-center" style={{ background: 'hsl(var(--primary)/0.06)' }}>
          <ShoppingBag className="h-8 w-8" style={{ color: 'hsl(var(--primary)/0.4)' }} />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 font-semibold text-foreground">{item.title}</h3>
        {item.description && <p className="mb-3 text-sm text-muted-foreground">{item.description}</p>}

        {item.shopUrl && (
          <a
            href={item.shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 inline-flex items-center gap-1 text-sm hover:underline"
            style={{ color: 'hsl(var(--primary))' }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Bekijk in webshop
          </a>
        )}

        <div className="mt-auto">
          {done ? (
            <div className="rounded-xl p-3 text-center text-sm font-medium" style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }}>
              ✓ Cadeau gereserveerd! Je ontvangt een bevestiging per e-mail.
            </div>
          ) : (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ background: 'hsl(var(--primary))' }}
              >
                Reserveer dit cadeau
                <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>

              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: expanded ? '500px' : '0', opacity: expanded ? 1 : 0 }}
              >
                <form onSubmit={handleReserve} className="mt-3 space-y-3">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jouw naam *"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Jouw e-mailadres *"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Persoonlijk bericht (optioneel)"
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ background: 'hsl(var(--primary))' }}
                  >
                    {submitting ? 'Reserveren…' : 'Reserveer'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Fund item ─────────────────────────────────────────────────────────────────

type ContributionState =
  | { phase: 'form' }
  | { phase: 'payment'; contributionId: string; confirmationToken: string; amountCents: number; reference: string; hasPaymentLink: boolean; paymentLink?: string; iban?: string; accountName?: string }
  | { phase: 'done' }

function FundItem({ item, slug }: { item: PublicRegistryItem; slug: string }) {
  const [expanded, setExpanded] = React.useState(false)
  const [state, setState] = React.useState<ContributionState>({ phase: 'form' })
  const [selectedAmount, setSelectedAmount] = React.useState<number | null>(null)
  const [customAmount, setCustomAmount] = React.useState('')
  const [showCustom, setShowCustom] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [copiedRef, setCopiedRef] = React.useState(false)
  const [copiedIban, setCopiedIban] = React.useState(false)

  const targetCents = item.targetAmount ?? 0
  const progressPct = targetCents > 0 ? Math.min(100, (item.totalConfirmed / targetCents) * 100) : 0

  const effectiveAmountCents = showCustom
    ? Math.round(parseFloat(customAmount || '0') * 100)
    : selectedAmount ?? 0

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (effectiveAmountCents < 500) {
      setError('Minimumbedrag is €5.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/registry/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          guest_name: name,
          guest_email: email,
          amount_cents: effectiveAmountCents,
          message,
          wedding_slug: slug,
        }),
      })
      const json = await res.json() as {
        success?: boolean
        error?: string
        contribution_id?: string
        confirmation_token?: string
        payment_reference?: string
        has_payment_link?: boolean
        payment_link?: string
        iban?: string
        account_name?: string
      }
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Er ging iets mis. Probeer opnieuw.')
        return
      }
      setState({
        phase: 'payment',
        contributionId: json.contribution_id!,
        confirmationToken: json.confirmation_token!,
        amountCents: effectiveAmountCents,
        reference: json.payment_reference!,
        hasPaymentLink: json.has_payment_link ?? false,
        paymentLink: json.payment_link,
        iban: json.iban,
        accountName: json.account_name,
      })
    } catch {
      setError('Controleer je verbinding en probeer opnieuw.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentConfirm = async (method: 'bank_transfer' | 'payment_link') => {
    if (state.phase !== 'payment') return
    setSubmitting(true)
    try {
      await fetch('/api/registry/contribute/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contribution_id: state.contributionId,
          confirmation_token: state.confirmationToken,
          payment_method: method,
        }),
      })
      setState({ phase: 'done' })
    } catch {
      // fail silently — contribution was already created
      setState({ phase: 'done' })
    } finally {
      setSubmitting(false)
    }
  }

  const copyText = async (text: string, which: 'ref' | 'iban') => {
    await navigator.clipboard.writeText(text)
    if (which === 'ref') { setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000) }
    else { setCopiedIban(true); setTimeout(() => setCopiedIban(false), 2000) }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover" />
      )}
      {!item.imageUrl && (
        <div className="flex h-32 items-center justify-center" style={{ background: 'hsl(var(--primary)/0.06)' }}>
          <PiggyBank className="h-8 w-8" style={{ color: 'hsl(var(--primary)/0.4)' }} />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 font-semibold text-foreground">{item.title}</h3>
        {item.description && <p className="mb-3 text-sm text-muted-foreground">{item.description}</p>}

        {/* Progress */}
        {targetCents > 0 && (
          <div className="mb-3 space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, background: 'hsl(var(--primary))' }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fmtEuro(item.totalConfirmed)} bijgedragen</span>
              <span>doel: {fmtEuro(targetCents)}</span>
            </div>
          </div>
        )}
        {item.contributorCount > 0 && (
          <p className="mb-3 text-xs text-muted-foreground">
            {item.contributorCount} gast{item.contributorCount !== 1 ? 'en' : ''} droeg{item.contributorCount !== 1 ? 'en' : ''} al bij
          </p>
        )}

        <div className="mt-auto">
          {state.phase === 'done' ? (
            <div className="rounded-xl p-3 text-center text-sm font-medium" style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }}>
              ✓ Bedankt voor je bijdrage!
            </div>
          ) : state.phase === 'payment' ? (
            <PaymentScreen
              state={state}
              submitting={submitting}
              copiedRef={copiedRef}
              copiedIban={copiedIban}
              onCopy={copyText}
              onConfirm={handlePaymentConfirm}
            />
          ) : (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ background: 'hsl(var(--primary))' }}
              >
                Draag bij
                <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>

              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: expanded ? '700px' : '0', opacity: expanded ? 1 : 0 }}
              >
                <form onSubmit={handleContribute} className="mt-3 space-y-3">
                  {/* Amount selection */}
                  {item.suggestedAmounts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.suggestedAmounts.sort((a, b) => a - b).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => { setSelectedAmount(amt); setShowCustom(false) }}
                          className={`rounded-full border px-3 py-1 text-sm transition-colors ${selectedAmount === amt && !showCustom ? 'border-primary bg-primary/10 font-semibold' : 'border-border hover:border-primary/50'}`}
                          style={selectedAmount === amt && !showCustom ? { borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))' } : {}}
                        >
                          {fmtEuro(amt)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setShowCustom(true); setSelectedAmount(null) }}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${showCustom ? 'border-primary bg-primary/10 font-semibold' : 'border-border hover:border-primary/50'}`}
                        style={showCustom ? { borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))' } : {}}
                      >
                        Zelf invullen
                      </button>
                    </div>
                  )}
                  {(showCustom || item.suggestedAmounts.length === 0) && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">€</span>
                      <input
                        type="number"
                        min="5"
                        max="10000"
                        step="1"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Bedrag"
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  )}

                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jouw naam *"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Jouw e-mailadres *"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Persoonlijk bericht (optioneel)"
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting || (!selectedAmount && !customAmount)}
                    className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ background: 'hsl(var(--primary))' }}
                  >
                    {submitting ? 'Bezig…' : 'Bevestig bijdrage'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Payment screen ────────────────────────────────────────────────────────────

interface PaymentScreenProps {
  state: Extract<ContributionState, { phase: 'payment' }>
  submitting: boolean
  copiedRef: boolean
  copiedIban: boolean
  onCopy: (text: string, which: 'ref' | 'iban') => void
  onConfirm: (method: 'bank_transfer' | 'payment_link') => void
}

function PaymentScreen({ state, submitting, copiedRef, copiedIban, onCopy, onConfirm }: PaymentScreenProps) {
  const amt = fmtEuro(state.amountCents)

  if (state.hasPaymentLink && state.paymentLink) {
    return (
      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">
          Bedankt! Klik hieronder om {amt} over te maken.
        </p>
        <a
          href={state.paymentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ background: 'hsl(var(--primary))' }}
        >
          <ExternalLink className="h-4 w-4" /> Ga naar betaallink →
        </a>
        <p className="text-xs text-center text-muted-foreground">Heb je betaald?</p>
        <button
          onClick={() => onConfirm('payment_link')}
          disabled={submitting}
          className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Bezig…' : 'Ik heb betaald ✓'}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Het koppel bevestigt jouw bijdrage zodra de betaling is ontvangen.
        </p>
      </div>
    )
  }

  // IBAN transfer
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Maak {amt} over naar:</p>
      {state.iban && (
        <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">IBAN:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{state.iban}</span>
              <button onClick={() => onCopy(state.iban!, 'iban')} className="text-muted-foreground hover:text-foreground">
                {copiedIban ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          {state.accountName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Naam:</span>
              <span className="font-medium">{state.accountName}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Omschrijving:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-foreground">{state.reference}</span>
              <button onClick={() => onCopy(state.reference, 'ref')} className="text-muted-foreground hover:text-foreground">
                {copiedRef ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
        Gebruik exact deze omschrijving zodat het koppel jouw bijdrage herkent.
      </p>
      <p className="text-xs text-center text-muted-foreground">Klaar met overmaken?</p>
      <button
        onClick={() => onConfirm('bank_transfer')}
        disabled={submitting}
        className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Bezig…' : 'Ik heb overgemaakt ✓'}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        Je bijdrage verschijnt als &quot;in behandeling&quot; totdat het koppel de ontvangst bevestigt.
      </p>
    </div>
  )
}

// ─── Main public registry section ─────────────────────────────────────────────

export interface PublicRegistrySectionProps {
  registry: PublicRegistryData
  slug: string
}

export function PublicRegistrySection({ registry, slug }: PublicRegistrySectionProps) {
  const storageKey = `registry_unlocked_${slug}`

  const [unlocked, setUnlocked] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(storageKey) === '1'
  })

  React.useEffect(() => {
    if (!registry.passwordRequired) setUnlocked(true)
  }, [registry.passwordRequired])

  if (!registry.enabled) return null

  if (registry.passwordRequired && !unlocked) {
    return (
      <PasswordGate slug={slug} onUnlocked={() => setUnlocked(true)} />
    )
  }

  return (
    <div>
      {registry.introText && (
        <p className="mb-6 whitespace-pre-line text-muted-foreground">{registry.introText}</p>
      )}

      {registry.items.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nog geen items toegevoegd.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {registry.items.map((item) =>
          item.type === 'gift' ? (
            <GiftItem key={item.id} item={item} slug={slug} />
          ) : (
            <FundItem key={item.id} item={item} slug={slug} />
          )
        )}
      </div>
    </div>
  )
}
