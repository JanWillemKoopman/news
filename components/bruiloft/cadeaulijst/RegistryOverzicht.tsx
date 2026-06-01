'use client'

import * as React from 'react'
import { CheckCircle2, Download } from 'lucide-react'

import { formatEuro } from '@/lib/bruiloft/format'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Card, CardContent, CardHeader, CardTitle, useToast } from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'

interface Props {
  isEditor: boolean
}

export function RegistryOverzicht({ isEditor }: Props) {
  const registryItems = useBruiloftStore((s) => s.registryItems)
  const registryReservations = useBruiloftStore((s) => s.registryReservations)
  const registryContributions = useBruiloftStore((s) => s.registryContributions)
  const confirmContributionReceipt = useBruiloftStore((s) => s.confirmContributionReceipt)
  const { toast } = useToast()

  // local "bedankkaartje verstuurd" state (UI helper, not persisted)
  const [thanked, setThanked] = React.useState<Set<string>>(new Set())

  const itemMap = new Map(registryItems.map((i) => [i.id, i]))

  const totalConfirmed = registryContributions
    .filter((c) => c.paymentStatus === 'confirmed')
    .reduce((s, c) => s + c.amount, 0)

  const handleConfirm = async (id: string) => {
    try {
      await confirmContributionReceipt(id)
      toast({ title: 'Bijdrage bevestigd', description: 'De gast heeft een bevestigingsmail ontvangen.', variant: 'success' })
    } catch {
      toast({ title: 'Bevestigen mislukt', variant: 'error' })
    }
  }

  const exportCsv = () => {
    const headers = ['Naam', 'E-mail', 'Cadeau / bijdrage', 'Bedrag', 'Bericht', 'Datum']
    const rows: (string | number)[][] = []

    for (const res of registryReservations) {
      const item = itemMap.get(res.itemId)
      rows.push([res.guestName, res.guestEmail, item?.title ?? 'Onbekend', '', res.message, res.reservedAt.slice(0, 10)])
    }
    for (const c of registryContributions) {
      const item = itemMap.get(c.itemId)
      rows.push([c.guestName, c.guestEmail, item?.title ?? 'Onbekend', (c.amount / 100).toFixed(2), c.message, c.contributedAt.slice(0, 10)])
    }

    downloadCsv('cadeaulijst-gasten.csv', headers, rows)
    toast({ title: 'CSV geëxporteerd', variant: 'success' })
  }

  // Build bedanklijst: unique guests from reservations + contributions
  const bedankMap = new Map<string, { naam: string; email: string; items: string[] }>()
  for (const res of registryReservations) {
    const key = res.guestEmail
    const item = itemMap.get(res.itemId)
    if (!bedankMap.has(key)) bedankMap.set(key, { naam: res.guestName, email: res.guestEmail, items: [] })
    if (item) bedankMap.get(key)!.items.push(item.title)
  }
  for (const c of registryContributions.filter((c) => c.paymentStatus !== 'cancelled')) {
    const key = c.guestEmail
    const item = itemMap.get(c.itemId)
    if (!bedankMap.has(key)) bedankMap.set(key, { naam: c.guestName, email: c.guestEmail, items: [] })
    if (item) {
      const label = `${item.title} (${formatEuro(c.amount / 100, { cents: true })})`
      bedankMap.get(key)!.items.push(label)
    }
  }
  const bedanklijst = Array.from(bedankMap.values())

  return (
    <div className="space-y-8">
      {/* Grand total */}
      {totalConfirmed > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm text-green-700">Totaal bevestigd ontvangen</p>
          <p className="mt-0.5 text-2xl font-bold text-green-800">
            {formatEuro(totalConfirmed / 100, { cents: true })}
          </p>
        </div>
      )}

      {/* Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Gereserveerde cadeaus</CardTitle>
        </CardHeader>
        <CardContent>
          {registryReservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen reserveringen.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Item</th>
                    <th className="pb-2 pr-4 font-medium">Gast</th>
                    <th className="pb-2 pr-4 font-medium hidden sm:table-cell">E-mail</th>
                    <th className="pb-2 pr-4 font-medium hidden md:table-cell">Datum</th>
                    <th className="pb-2 font-medium hidden lg:table-cell">Bericht</th>
                  </tr>
                </thead>
                <tbody>
                  {registryReservations.map((res) => {
                    const item = itemMap.get(res.itemId)
                    return (
                      <tr key={res.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{item?.title ?? '—'}</td>
                        <td className="py-2.5 pr-4">{res.guestName}</td>
                        <td className="py-2.5 pr-4 hidden sm:table-cell text-muted-foreground">{res.guestEmail}</td>
                        <td className="py-2.5 pr-4 hidden md:table-cell text-muted-foreground">{res.reservedAt.slice(0, 10)}</td>
                        <td className="py-2.5 hidden lg:table-cell text-muted-foreground">{res.message || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contributions */}
      <Card>
        <CardHeader>
          <CardTitle>Geldfonds bijdragen</CardTitle>
        </CardHeader>
        <CardContent>
          {registryContributions.filter((c) => c.paymentStatus !== 'cancelled').length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen bijdragen.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Item</th>
                    <th className="pb-2 pr-4 font-medium">Gast</th>
                    <th className="pb-2 pr-4 font-medium">Bedrag</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium hidden md:table-cell">Datum</th>
                    <th className="pb-2 pr-4 font-medium hidden lg:table-cell">Bericht</th>
                    {isEditor && <th className="pb-2 font-medium">Actie</th>}
                  </tr>
                </thead>
                <tbody>
                  {registryContributions
                    .filter((c) => c.paymentStatus !== 'cancelled')
                    .map((c) => {
                      const item = itemMap.get(c.itemId)
                      return (
                        <tr key={c.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 pr-4 font-medium">{item?.title ?? '—'}</td>
                          <td className="py-2.5 pr-4">{c.guestName}</td>
                          <td className="py-2.5 pr-4 font-medium">{formatEuro(c.amount / 100, { cents: true })}</td>
                          <td className="py-2.5 pr-4">
                            {c.paymentStatus === 'confirmed' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                <CheckCircle2 className="h-3 w-3" /> Bevestigd
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                In behandeling
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 hidden md:table-cell text-muted-foreground">{c.contributedAt.slice(0, 10)}</td>
                          <td className="py-2.5 pr-4 hidden lg:table-cell text-muted-foreground">{c.message || '—'}</td>
                          {isEditor && (
                            <td className="py-2.5">
                              {c.paymentStatus === 'pending' && (
                                <Button size="sm" variant="outline" onClick={() => handleConfirm(c.id)}>
                                  Bevestig ontvangst
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                </tbody>
              </table>

              {/* Per-item totals */}
              <div className="mt-4 space-y-1 border-t border-border pt-4">
                {registryItems.filter((i) => i.type === 'fund').map((item) => {
                  const itemContribs = registryContributions.filter((c) => c.itemId === item.id && c.paymentStatus !== 'cancelled')
                  if (itemContribs.length === 0) return null
                  const confirmed = itemContribs.filter((c) => c.paymentStatus === 'confirmed').reduce((s, c) => s + c.amount, 0)
                  const pending = itemContribs.filter((c) => c.paymentStatus === 'pending').reduce((s, c) => s + c.amount, 0)
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.title}:</span>
                      <span>
                        <span className="font-medium text-green-700">{formatEuro(confirmed / 100, { cents: true })}</span>
                        {pending > 0 && <span className="ml-2 text-amber-600">+ {formatEuro(pending / 100, { cents: true })} in behandeling</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bedanklijst */}
      {bedanklijst.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bedanklijst</CardTitle>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Exporteer CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bedanklijst.map((guest) => (
                <div key={guest.email} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    checked={thanked.has(guest.email)}
                    onChange={(e) => {
                      setThanked((prev) => {
                        const next = new Set(prev)
                        if (e.target.checked) next.add(guest.email)
                        else next.delete(guest.email)
                        return next
                      })
                    }}
                    className="mt-0.5 h-4 w-4 accent-rose-600"
                    aria-label={`Bedankkaartje verstuurd naar ${guest.naam}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${thanked.has(guest.email) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {guest.naam}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{guest.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{guest.items.join(' · ')}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Vinkje "bedankkaartje verstuurd" wordt niet opgeslagen bij afsluiten.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
