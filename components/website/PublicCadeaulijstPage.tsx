'use client'

import * as React from 'react'
import { ArrowLeft, Check, ChevronDown, Copy, ExternalLink, Gift, Lock, Menu, PiggyBank, X } from 'lucide-react'

import { PasswordInput } from '@/components/ui/password-input'
import Link from 'next/link'
import type { PublicRegistryData, PublicRegistryItem, WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'

// ─── Utilities ───────────────────────────────────────────────────────────────

function hexNaarHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

const LETTERTYPE_VAR: Record<WeddingLettertype, string> = {
  cormorant:        'var(--font-serif)',
  playfair:         'var(--font-playfair)',
  lora:             'var(--font-lora)',
  'dancing-script': 'var(--font-dancing)',
  'eb-garamond':    'var(--font-garamond)',
  'great-vibes':    'var(--font-vibes)',
}

function fmtEuro(cents: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function formatDatumNL(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Password gate ────────────────────────────────────────────────────────────

interface UnlockData {
  items: PublicRegistryItem[]
  bankAccountIban: string
  bankAccountName: string
}

function PasswordGate({ slug, onUnlocked, headingFont }: { slug: string; onUnlocked: (data: UnlockData) => void; headingFont: string }) {
  const [pw, setPw] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/registry/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password: pw }),
      })
      const json = await res.json() as { ok: boolean; items?: PublicRegistryItem[]; bankAccountIban?: string; bankAccountName?: string }
      if (json.ok) {
        onUnlocked({
          items: json.items ?? [],
          bankAccountIban: json.bankAccountIban ?? '',
          bankAccountName: json.bankAccountName ?? '',
        })
      } else {
        setError('Onjuist wachtwoord.')
      }
    } catch {
      setError('Controleer je verbinding.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-black/5">
        <Lock className="h-6 w-6" style={{ color: 'hsl(var(--primary))' }} />
      </div>
      <h2 className="mb-1 text-xl font-semibold" style={{ fontFamily: headingFont }}>Beveiligd met wachtwoord</h2>
      <p className="mb-6 text-sm text-gray-500">Voer het wachtwoord in om de cadeaulijst te bekijken.</p>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <PasswordInput
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Wachtwoord"
          inputClassName="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': 'hsl(var(--primary)/0.3)' } as React.CSSProperties}
          autoComplete="off"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pw}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-40"
          style={{ background: 'hsl(var(--primary))' }}
        >
          {loading ? 'Controleren…' : 'Bekijken'}
        </button>
      </form>
    </div>
  )
}

// ─── Gift card ────────────────────────────────────────────────────────────────

interface GiftCardProps {
  item: PublicRegistryItem
  slug: string
  onReserved: () => void
  cardClass: string
  imageClass: string
}

function GiftCard({ item, slug, onReserved, cardClass, imageClass }: GiftCardProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Vul je naam in.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/registry/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, guest_name: name.trim(), guest_email: email.trim(), wedding_slug: slug }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        setError(json.error ?? 'Er ging iets mis.')
        return
      }
      onReserved()
    } catch {
      setError('Controleer je verbinding.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cardClass}>
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.title} className={imageClass} />
      ) : (
        <div className="flex h-36 items-center justify-center bg-black/3">
          <Gift className="h-10 w-10 opacity-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-1 font-semibold text-gray-900">{item.title}</h3>
        {item.description && <p className="mb-3 text-sm text-gray-500 leading-relaxed">{item.description}</p>}
        {item.shopUrl && (
          <a href={item.shopUrl} target="_blank" rel="noopener noreferrer" className="mb-3 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition">
            <ExternalLink className="h-3 w-3" /> Bekijk in webshop
          </a>
        )}
        <div className="mt-auto">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: 'hsl(var(--primary))' }}
            >
              Ik koop dit cadeau
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <p className="text-xs font-medium text-gray-500">Jouw gegevens</p>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Jouw naam *"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'hsl(var(--primary)/0.3)' } as React.CSSProperties} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mailadres (optioneel)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'hsl(var(--primary)/0.3)' } as React.CSSProperties} />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setExpanded(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition">
                  Annuleren
                </button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'hsl(var(--primary))' }}>
                  {submitting ? 'Bezig…' : 'Bevestig'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Fund card ────────────────────────────────────────────────────────────────

interface FundCardProps {
  item: PublicRegistryItem
  registry: PublicRegistryData
  cardClass: string
  imageClass: string
}

function FundCard({ item, registry, cardClass, imageClass }: FundCardProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [copiedIban, setCopiedIban] = React.useState(false)
  const targetCents = item.targetAmount ?? 0
  const progressPct = targetCents > 0 ? Math.min(100, (item.totalConfirmed / targetCents) * 100) : 0

  const copyIban = async () => {
    if (!registry.bankAccountIban) return
    await navigator.clipboard.writeText(registry.bankAccountIban)
    setCopiedIban(true)
    setTimeout(() => setCopiedIban(false), 2000)
  }

  return (
    <div className={cardClass}>
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.title} className={imageClass} />
      ) : (
        <div className="flex h-36 items-center justify-center bg-black/3">
          <PiggyBank className="h-10 w-10 opacity-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-1 font-semibold text-gray-900">{item.title}</h3>
        {item.description && <p className="mb-3 text-sm text-gray-500 leading-relaxed">{item.description}</p>}

        {targetCents > 0 && (
          <div className="mb-3 space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/8">
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: 'hsl(var(--primary))' }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{fmtEuro(item.totalConfirmed)} bijgedragen</span>
              <span>doel: {fmtEuro(targetCents)}</span>
            </div>
          </div>
        )}

        <div className="mt-auto">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: 'hsl(var(--primary))' }}
          >
            Bijdragen
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {item.paymentLink && (
                <>
                  <a href={item.paymentLink} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                    <ExternalLink className="h-4 w-4" /> Betalen via link
                  </a>
                  {registry.bankAccountIban && <p className="text-center text-xs text-gray-400">of via bankoverschrijving:</p>}
                </>
              )}
              {registry.bankAccountIban && (
                <div className="rounded-xl bg-black/3 p-3 space-y-2 text-sm">
                  {item.suggestedAmounts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <p className="w-full text-xs text-gray-400 mb-0.5">Suggesties:</p>
                      {[...item.suggestedAmounts].sort((a,b)=>a-b).map(amt => (
                        <span key={amt} className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600">{fmtEuro(amt)}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">IBAN:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-gray-800">{registry.bankAccountIban}</span>
                      <button onClick={copyIban} className="text-gray-400 hover:text-gray-700 transition">
                        {copiedIban ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  {registry.bankAccountName && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Naam:</span>
                      <span className="text-xs font-medium text-gray-800">{registry.bankAccountName}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">Vermeld de naam van het fonds bij de omschrijving.</p>
                </div>
              )}
              {!item.paymentLink && !registry.bankAccountIban && (
                <p className="text-center text-xs text-gray-400">Het koppel deelt de betaalinformatie persoonlijk.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Items grid ───────────────────────────────────────────────────────────────

interface ItemsGridProps {
  giftItems: PublicRegistryItem[]
  fundItems: PublicRegistryItem[]
  registry: PublicRegistryData
  slug: string
  reservedIds: Set<string>
  onReserved: (id: string) => void
  cardClass: string
  imageClass: string
  headingFont: string
}

function ItemsGrid({ giftItems, fundItems, registry, slug, reservedIds, onReserved, cardClass, imageClass, headingFont }: ItemsGridProps) {
  const availableGifts = giftItems.filter(i => !i.isReserved && !reservedIds.has(i.id))
  const availableFunds = fundItems.filter(i => !reservedIds.has(i.id))
  const totalAvailable = availableGifts.length + availableFunds.length

  if (totalAvailable === 0 && registry.items.length > 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
        <p className="text-3xl mb-3">🎉</p>
        <p className="font-semibold text-gray-800" style={{ fontFamily: headingFont }}>Alle cadeaus zijn al gereserveerd!</p>
        <p className="mt-1 text-sm text-gray-400">Wat geweldig — het bruidspaar wordt verwend.</p>
      </div>
    )
  }

  const showLabels = availableGifts.length > 0 && availableFunds.length > 0

  return (
    <div className="space-y-10">
      {availableGifts.length > 0 && (
        <section>
          {showLabels && (
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Cadeauwensen</h2>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {availableGifts.map(item => (
              <GiftCard key={item.id} item={item} slug={slug} cardClass={`flex flex-col overflow-hidden ${cardClass}`} imageClass={imageClass} onReserved={() => onReserved(item.id)} />
            ))}
          </div>
        </section>
      )}
      {availableFunds.length > 0 && (
        <section>
          {showLabels && (
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Geldfondsen</h2>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {availableFunds.map(item => (
              <FundCard key={item.id} item={item} registry={registry} cardClass={`flex flex-col overflow-hidden ${cardClass}`} imageClass={imageClass} />
            ))}
          </div>
        </section>
      )}
      {registry.items.filter(i => i.isReserved).length > 0 && totalAvailable > 0 && (
        <p className="text-center text-xs text-gray-400">
          {registry.items.filter(i => i.isReserved).length} cadeau{registry.items.filter(i => i.isReserved).length !== 1 ? 's' : ''} al gereserveerd
        </p>
      )}
    </div>
  )
}

// ─── Template layouts ─────────────────────────────────────────────────────────

interface TplProps {
  registry: PublicRegistryData
  slug: string
  unlocked: boolean
  onUnlocked: (data: UnlockData) => void
  reservedIds: Set<string>
  onReserved: (id: string) => void
  headingFont: string
}

// ── Klassiek ──────────────────────────────────────────────────────────────────

function AterlierOrnament() {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary)/0.2)' }} />
      <span style={{ color: 'hsl(var(--primary)/0.4)', fontSize: '7px', letterSpacing: '4px' }}>◆◆◆</span>
      <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary)/0.2)' }} />
    </div>
  )
}

function KlassiekLayout({ registry, slug, unlocked, onUnlocked, reservedIds, onReserved, headingFont }: TplProps) {
  return (
    <div className="bg-white min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/96 backdrop-blur-sm" style={{ boxShadow: '0 1px 0 hsl(var(--primary)/0.12)' }}>
        <div className="py-3 text-center border-b relative" style={{ borderColor: 'hsl(var(--primary)/0.1)' }}>
          <p className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
            {registry.partner1Naam} &amp; {registry.partner2Naam}
          </p>
          <Link href={`/trouwen/${slug}`} className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Trouwwebsite
          </Link>
        </div>
        <div className="flex justify-center py-2">
          <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Cadeaulijst</p>
        </div>
      </nav>

      <main className="mx-auto max-w-xl px-4 pb-24 pt-8">
        {/* Title */}
        <div className="text-center mb-10">
          <AterlierOrnament />
          <h1 className="text-3xl text-foreground" style={{ fontFamily: headingFont }}>Cadeaulijst</h1>
          <p className="mt-1 text-sm text-muted-foreground">{registry.partner1Naam} &amp; {registry.partner2Naam}</p>
          {registry.trouwdatum && <p className="mt-0.5 text-xs text-muted-foreground">{formatDatumNL(registry.trouwdatum)}</p>}
          <AterlierOrnament />
        </div>

        {!unlocked ? (
          <PasswordGate slug={slug} onUnlocked={onUnlocked} headingFont={headingFont} />
        ) : (
          <>
            {registry.introText && (
              <p className="mb-10 whitespace-pre-line text-center text-muted-foreground leading-relaxed">{registry.introText}</p>
            )}
            <ItemsGrid
              giftItems={registry.items.filter(i => i.type === 'gift')}
              fundItems={registry.items.filter(i => i.type === 'fund')}
              registry={registry} slug={slug} reservedIds={reservedIds} onReserved={onReserved}
              headingFont={headingFont}
              cardClass="rounded-2xl border bg-white shadow-sm"
              imageClass="h-48 w-full object-cover"
            />
          </>
        )}

        <div className="mt-12 text-center">
          <Link href={`/trouwen/${slug}`} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Terug naar trouwwebsite
          </Link>
        </div>
      </main>
    </div>
  )
}

// ── Modern ────────────────────────────────────────────────────────────────────

function ModernLayout({ registry, slug, unlocked, onUnlocked, reservedIds, onReserved, headingFont }: TplProps) {
  return (
    <div className="bg-white min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white border-b border-black/10">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-5xl mx-auto">
          <Link href={`/trouwen/${slug}`} className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Trouwwebsite
          </Link>
          <span className="text-xs tracking-[0.2em] uppercase font-medium text-foreground">
            {registry.partner1Naam} &amp; {registry.partner2Naam}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Cadeaulijst</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 md:px-12 pb-24">
        {/* Title */}
        <div className="py-14 border-b border-black/8">
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-3" style={{ color: 'hsl(var(--primary))' }}>01</p>
          <h1 className="text-4xl md:text-5xl tracking-tight text-foreground" style={{ fontFamily: headingFont, letterSpacing: '-0.02em' }}>
            Cadeaulijst
          </h1>
          {registry.trouwdatum && <p className="mt-3 text-xs tracking-[0.15em] uppercase text-muted-foreground">{formatDatumNL(registry.trouwdatum)}</p>}
        </div>

        {!unlocked ? (
          <div className="py-14">
            <PasswordGate slug={slug} onUnlocked={onUnlocked} headingFont={headingFont} />
          </div>
        ) : (
          <div className="py-14">
            {registry.introText && (
              <p className="mb-10 whitespace-pre-line text-gray-600 leading-relaxed">{registry.introText}</p>
            )}
            <ItemsGrid
              giftItems={registry.items.filter(i => i.type === 'gift')}
              fundItems={registry.items.filter(i => i.type === 'fund')}
              registry={registry} slug={slug} reservedIds={reservedIds} onReserved={onReserved}
              headingFont={headingFont}
              cardClass="border border-black/8 bg-white"
              imageClass="h-52 w-full object-cover"
            />
          </div>
        )}
      </main>
    </div>
  )
}

// ── Romantisch ────────────────────────────────────────────────────────────────

function RomantischLayout({ registry, slug, unlocked, onUnlocked, reservedIds, onReserved, headingFont }: TplProps) {
  const warmBg = 'hsl(30 38% 97%)'
  const warmCard = 'hsl(30 25% 93%)'

  return (
    <div style={{ background: warmBg }} className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-sm border-b" style={{ background: `${warmBg}ee`, borderColor: 'hsl(var(--primary)/0.12)' }}>
        <div className="relative max-w-xl mx-auto px-4 py-3 flex flex-col items-center gap-0.5">
          <span className="text-base font-medium text-foreground" style={{ fontFamily: headingFont }}>
            {registry.partner1Naam} &amp; {registry.partner2Naam}
          </span>
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Cadeaulijst</span>
          <Link href={`/trouwen/${slug}`} className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
            <ArrowLeft className="h-3 w-3" /> Terug
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-xl px-4 pb-24 pt-10">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary)/0.2)' }} />
            <span className="text-sm" style={{ color: 'hsl(var(--primary)/0.5)' }}>✦</span>
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary)/0.2)' }} />
          </div>
          <h1 className="text-3xl text-foreground" style={{ fontFamily: headingFont }}>Cadeaulijst</h1>
          {registry.trouwdatum && <p className="mt-2 text-xs text-muted-foreground">{formatDatumNL(registry.trouwdatum)}</p>}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary)/0.2)' }} />
            <span className="text-sm" style={{ color: 'hsl(var(--primary)/0.5)' }}>✦</span>
            <div className="flex-1 h-px" style={{ background: 'hsl(var(--primary)/0.2)' }} />
          </div>
        </div>

        {!unlocked ? (
          <PasswordGate slug={slug} onUnlocked={onUnlocked} headingFont={headingFont} />
        ) : (
          <>
            {registry.introText && (
              <p className="mb-10 whitespace-pre-line text-center text-muted-foreground leading-relaxed">{registry.introText}</p>
            )}
            <ItemsGrid
              giftItems={registry.items.filter(i => i.type === 'gift')}
              fundItems={registry.items.filter(i => i.type === 'fund')}
              registry={registry} slug={slug} reservedIds={reservedIds} onReserved={onReserved}
              headingFont={headingFont}
              cardClass={`rounded-2xl border bg-[${warmCard}]`}
              imageClass="h-44 w-full object-cover"
            />
          </>
        )}

        <div className="mt-12 text-center">
          <Link href={`/trouwen/${slug}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-3 w-3" /> Terug naar trouwwebsite
          </Link>
        </div>
      </main>
    </div>
  )
}

// ── Rustiek ───────────────────────────────────────────────────────────────────

function RustiekLayout({ registry, slug, unlocked, onUnlocked, reservedIds, onReserved, headingFont }: TplProps) {
  const donkerNav = 'hsl(35 20% 18%)'
  const linnenBg = 'hsl(42 25% 94%)'

  return (
    <div style={{ background: linnenBg }} className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40" style={{ background: donkerNav }}>
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href={`/trouwen/${slug}`} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
            <ArrowLeft className="h-3 w-3" /> Trouwwebsite
          </Link>
          <span className="text-sm font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.88)' }}>
            {registry.partner1Naam} &amp; {registry.partner2Naam}
          </span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>Cadeaulijst</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-24 pt-10">
        {/* Title */}
        <div className="mb-10 pb-6 border-b-2" style={{ borderColor: 'hsl(var(--primary)/0.2)' }}>
          <h1 className="text-3xl font-semibold text-foreground" style={{ fontFamily: headingFont }}>Cadeaulijst</h1>
          <p className="mt-1 text-sm text-muted-foreground">{registry.partner1Naam} &amp; {registry.partner2Naam}</p>
          {registry.trouwdatum && <p className="mt-0.5 text-xs text-muted-foreground">{formatDatumNL(registry.trouwdatum)}</p>}
        </div>

        {!unlocked ? (
          <PasswordGate slug={slug} onUnlocked={onUnlocked} headingFont={headingFont} />
        ) : (
          <>
            {registry.introText && (
              <p className="mb-10 whitespace-pre-line text-gray-600 leading-relaxed">{registry.introText}</p>
            )}
            <ItemsGrid
              giftItems={registry.items.filter(i => i.type === 'gift')}
              fundItems={registry.items.filter(i => i.type === 'fund')}
              registry={registry} slug={slug} reservedIds={reservedIds} onReserved={onReserved}
              headingFont={headingFont}
              cardClass={`rounded-xl border bg-white`}
              imageClass="h-44 w-full object-cover"
            />
          </>
        )}
      </main>
    </div>
  )
}

// ── Puur (Minimalistisch) ─────────────────────────────────────────────────────

function PuurLayout({ registry, slug, unlocked, onUnlocked, reservedIds, onReserved, headingFont }: TplProps) {
  return (
    <div className="bg-white min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white border-b border-black/8">
        <div className="px-8 md:px-16 py-4 flex items-center justify-between max-w-4xl">
          <Link href={`/trouwen/${slug}`} className="flex items-center gap-1.5 text-[9px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Trouwwebsite
          </Link>
          <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">
            {registry.partner1Naam} &amp; {registry.partner2Naam}
          </span>
        </div>
      </nav>

      <main className="px-8 md:px-16 pb-24 max-w-4xl">
        {/* Title */}
        <div className="py-16 border-b border-black/8">
          <h1 style={{ fontFamily: headingFont, fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1.0, letterSpacing: '-0.03em' }}
            className="text-foreground">
            Cadeau&shy;lijst
          </h1>
          {registry.trouwdatum && (
            <p className="mt-4 text-xs tracking-[0.2em] uppercase text-muted-foreground">{formatDatumNL(registry.trouwdatum)}</p>
          )}
        </div>

        {!unlocked ? (
          <div className="py-16">
            <PasswordGate slug={slug} onUnlocked={onUnlocked} headingFont={headingFont} />
          </div>
        ) : (
          <div className="py-16">
            {registry.introText && (
              <p className="mb-12 whitespace-pre-line text-gray-500 leading-relaxed max-w-lg">{registry.introText}</p>
            )}
            <ItemsGrid
              giftItems={registry.items.filter(i => i.type === 'gift')}
              fundItems={registry.items.filter(i => i.type === 'fund')}
              registry={registry} slug={slug} reservedIds={reservedIds} onReserved={onReserved}
              headingFont={headingFont}
              cardClass="bg-gray-50 rounded-2xl"
              imageClass="h-48 w-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
            />
          </div>
        )}
      </main>
    </div>
  )
}

// ── Botanisch ─────────────────────────────────────────────────────────────────

function BotanischLayout({ registry, slug, unlocked, onUnlocked, reservedIds, onReserved, headingFont }: TplProps) {
  return (
    <div className="bg-white min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 text-white" style={{ background: 'hsl(var(--primary))' }}>
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link href={`/trouwen/${slug}`} className="flex items-center gap-1.5 text-[11px] transition-colors" style={{ color: 'rgba(255,255,255,0.65)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>
            <ArrowLeft className="h-3 w-3" /> Trouwwebsite
          </Link>
          <span className="text-sm font-medium flex items-center gap-2">
            <span style={{ opacity: 0.55 }}>❧</span>
            {registry.partner1Naam} &amp; {registry.partner2Naam}
            <span style={{ opacity: 0.55 }}>❧</span>
          </span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>Cadeaulijst</span>
        </div>
      </nav>

      {/* Header block */}
      <div className="py-12 text-center text-white" style={{ background: 'hsl(var(--primary))' }}>
        <p className="text-3xl mb-4" style={{ opacity: 0.4 }}>❧</p>
        <h1 className="text-3xl font-medium" style={{ fontFamily: headingFont }}>Cadeaulijst</h1>
        <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {registry.partner1Naam} &amp; {registry.partner2Naam}
        </p>
        {registry.trouwdatum && (
          <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDatumNL(registry.trouwdatum)}</p>
        )}
        <p className="text-3xl mt-4" style={{ opacity: 0.4 }}>❧</p>
      </div>

      <main className="max-w-2xl mx-auto px-5 pb-24 pt-10">
        {!unlocked ? (
          <PasswordGate slug={slug} onUnlocked={onUnlocked} headingFont={headingFont} />
        ) : (
          <>
            {registry.introText && (
              <p className="mb-10 whitespace-pre-line text-center text-gray-600 leading-relaxed">{registry.introText}</p>
            )}
            <ItemsGrid
              giftItems={registry.items.filter(i => i.type === 'gift')}
              fundItems={registry.items.filter(i => i.type === 'fund')}
              registry={registry} slug={slug} reservedIds={reservedIds} onReserved={onReserved}
              headingFont={headingFont}
              cardClass="rounded-2xl border bg-white"
              imageClass="h-48 w-full object-cover"
            />
          </>
        )}
      </main>
    </div>
  )
}

// ─── Template map ─────────────────────────────────────────────────────────────

const LAYOUTS: Record<WeddingThema, React.ComponentType<TplProps>> = {
  klassiek:       KlassiekLayout,
  modern:         ModernLayout,
  romantisch:     RomantischLayout,
  rustiek:        RustiekLayout,
  minimalistisch: PuurLayout,
  botanisch:      BotanischLayout,
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface PublicCadeaulijstPageProps {
  registry: PublicRegistryData
  slug: string
}

export function PublicCadeaulijstPage({ registry, slug }: PublicCadeaulijstPageProps) {
  const headingFont = LETTERTYPE_VAR[registry.kopLettertype] ?? LETTERTYPE_VAR.cormorant

  const [unlocked, setUnlocked] = React.useState<boolean>(!registry.passwordRequired)
  const [liveRegistry, setLiveRegistry] = React.useState<PublicRegistryData>(registry)

  const [reservedIds, setReservedIds] = React.useState<Set<string>>(new Set())

  const themaVars: React.CSSProperties = {
    '--primary':            hexNaarHsl(liveRegistry.kleurAccent || '#a75573'),
    '--primary-foreground': '0 0% 100%',
    '--heading-font':       headingFont,
  } as React.CSSProperties

  const Layout = LAYOUTS[liveRegistry.thema] ?? KlassiekLayout

  const handleUnlocked = (data: UnlockData) => {
    setLiveRegistry(prev => ({
      ...prev,
      items: data.items,
      bankAccountIban: data.bankAccountIban,
      bankAccountName: data.bankAccountName,
    }))
    setUnlocked(true)
  }

  return (
    <div style={themaVars}>
      <Layout
        registry={liveRegistry}
        slug={slug}
        unlocked={unlocked}
        onUnlocked={handleUnlocked}
        reservedIds={reservedIds}
        onReserved={(id) => setReservedIds(prev => new Set(Array.from(prev).concat(id)))}
        headingFont={headingFont}
      />
    </div>
  )
}
