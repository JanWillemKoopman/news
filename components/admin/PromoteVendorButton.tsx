'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { SUPPLIER_TABLE_CATEGORIEEN, type SupplierTableCategorie } from '@/lib/bruiloft/suppliers/types'

export function PromoteVendorButton({ vendorId }: { vendorId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [categorie, setCategorie] = useState<SupplierTableCategorie>('overig')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function promote() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/leveranciers/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, categorie }),
    })
    setLoading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Promoveren mislukt')
      return
    }
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors"
      >
        Promoveer naar catalogus
      </button>
    )
  }

  return (
    <div className="shrink-0 flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value as SupplierTableCategorie)}
          disabled={loading}
          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
        >
          {SUPPLIER_TABLE_CATEGORIEEN.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={promote}
          disabled={loading}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Bezig…' : 'Bevestig'}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          Annuleer
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
