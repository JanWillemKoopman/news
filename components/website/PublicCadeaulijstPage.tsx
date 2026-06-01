'use client'

import * as React from 'react'
import { ArrowLeft, Check, ChevronDown, Copy, ExternalLink, Gift, Lock, PiggyBank } from 'lucide-react'
import Link from 'next/link'
import type { PublicRegistryData, PublicRegistryItem } from '@/lib/bruiloft/types'

function fmtEuro(cents: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

// ─── Password gate ────────────────────────────────────────────────────────────

function PasswordGate({ slug, onUnlocked }: { slug: string; onUnlocked: () => void }) {
  const [pw, setPw] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/registry/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password: pw }),
      })
      const json = await res.json() as { ok: boolean }
      if (json.ok) {
        sessionStorage.setItem(`registry_unlocked_${slug}`, '1')
        onUnlocked()
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <Lock className="h-6 w-6 text-gray-500" />
      </div>
      <h2 className="mb-1 text-xl font-semibold">Beveiligd met wachtwoord</h2>
      <p className="mb-6 text-sm text-gray-500">Voer het wachtwoord in om de cadeaulijst te bekijken.</p>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Wachtwoord"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          autoComplete="off"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pw}
          className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-40"
        >
          {loading ? 'Controleren…' : 'Bekijken'}
        </button>
      </form>
    </div>
  )
}

// ─── Gift item ─────────────────────────────────────────────────────────────────

function GiftCard({ item, slug, onReserved }: { item: PublicRegistryItem; slug: string; onReserved: () => void }) {
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
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.title} className="h-48 w-full object-cover" />
      ) : (
        <div className="flex h-36 items-center justify-center bg-gray-50">
          <Gift className="h-10 w-10 text-gray-200" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
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
              className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Ik koop dit cadeau
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <p className="text-xs font-medium text-gray-600">Jouw gegevens</p>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jouw naam *"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mailadres (optioneel — voor annuleerlink)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setExpanded(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition">
                  Annuleren
                </button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50">
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

// ─── Fund item ─────────────────────────────────────────────────────────────────

function FundCard({ item, registry }: { item: PublicRegistryItem; registry: PublicRegistryData }) {
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
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.title} className="h-48 w-full object-cover" />
      ) : (
        <div className="flex h-36 items-center justify-center bg-gray-50">
          <PiggyBank className="h-10 w-10 text-gray-200" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 font-semibold text-gray-900">{item.title}</h3>
        {item.description && <p className="mb-3 text-sm text-gray-500 leading-relaxed">{item.description}</p>}

        {targetCents > 0 && (
          <div className="mb-3 space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${progressPct}%` }} />
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
            className="flex w-full items-center justify-between rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
          >
            Bijdragen
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {item.paymentLink ? (
                <>
                  <a
                    href={item.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    <ExternalLink className="h-4 w-4" /> Betalen via link
                  </a>
                  {(registry.bankAccountIban) && (
                    <p className="text-center text-xs text-gray-400">of via bankoverschrijving:</p>
                  )}
                </>
              ) : null}

              {registry.bankAccountIban && (
                <div className="rounded-xl bg-gray-50 p-3 space-y-2 text-sm">
                  {item.suggestedAmounts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <p className="w-full text-xs text-gray-400 mb-0.5">Suggesties:</p>
                      {item.suggestedAmounts.sort((a,b)=>a-b).map(amt => (
                        <span key={amt} className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600">{fmtEuro(amt)}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">IBAN:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-gray-800">{registry.bankAccountIban}</span>
                      <button onClick={copyIban} className="text-gray-400 hover:text-gray-700 transition">
                        {copiedIban ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  {registry.bankAccountName && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Naam:</span>
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

// ─── Main component ───────────────────────────────────────────────────────────

export interface PublicCadeaulijstPageProps {
  registry: PublicRegistryData
  slug: string
}

export function PublicCadeaulijstPage({ registry, slug }: PublicCadeaulijstPageProps) {
  const storageKey = `registry_unlocked_${slug}`

  const [unlocked, setUnlocked] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(storageKey) === '1'
  })

  React.useEffect(() => {
    if (!registry.passwordRequired) setUnlocked(true)
  }, [registry.passwordRequired])

  // Track which items have been reserved this session (optimistic hide)
  const [reservedIds, setReservedIds] = React.useState<Set<string>>(new Set())

  const coupleNames = `${registry.partner1Naam} & ${registry.partner2Naam}`

  // Available items: not reserved in DB, and not reserved this session
  const availableItems = registry.items.filter(
    (item) => !item.isReserved && !reservedIds.has(item.id)
  )

  const giftItems = availableItems.filter((i) => i.type === 'gift')
  const fundItems = availableItems.filter((i) => i.type === 'fund')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link
            href={`/trouwen/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Terug naar trouwwebsite
          </Link>
          <span className="text-sm font-medium text-gray-600">{coupleNames}</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Title */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <Gift className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">Cadeaulijst</h1>
          <p className="text-sm text-gray-400">{coupleNames}</p>
        </div>

        {/* Password gate */}
        {registry.passwordRequired && !unlocked ? (
          <PasswordGate slug={slug} onUnlocked={() => setUnlocked(true)} />
        ) : (
          <>
            {/* Intro text */}
            {registry.introText && (
              <p className="mb-8 whitespace-pre-line text-center text-gray-600 leading-relaxed">{registry.introText}</p>
            )}

            {/* All items reserved */}
            {availableItems.length === 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="font-semibold text-gray-800">Alle cadeaus zijn al gereserveerd!</p>
                <p className="mt-1 text-sm text-gray-400">Wat geweldig — het bruidspaar wordt verwend.</p>
              </div>
            )}

            {/* Gift items */}
            {giftItems.length > 0 && (
              <section className="mb-10">
                {fundItems.length > 0 && (
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Cadeauwensen</h2>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {giftItems.map((item) => (
                    <GiftCard
                      key={item.id}
                      item={item}
                      slug={slug}
                      onReserved={() => setReservedIds((prev) => new Set(Array.from(prev).concat(item.id)))}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Fund items */}
            {fundItems.length > 0 && (
              <section>
                {giftItems.length > 0 && (
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">Geldfondsen</h2>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {fundItems.map((item) => (
                    <FundCard key={item.id} item={item} registry={registry} />
                  ))}
                </div>
              </section>
            )}

            {/* Reserved items count */}
            {registry.items.some((i) => i.isReserved) && availableItems.length > 0 && (
              <p className="mt-8 text-center text-xs text-gray-400">
                {registry.items.filter((i) => i.isReserved).length} cadeau{registry.items.filter((i) => i.isReserved).length !== 1 ? 's' : ''} al gereserveerd
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
