'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2, LogOut, Trash2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Section = 'idle' | 'saving-name' | 'saving-password' | 'deleting'

export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nameSuccess, setNameSuccess] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteInput, setShowDeleteInput] = useState(false)

  const [busy, setBusy] = useState<Section>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { router.replace('/login'); return }
      setEmail(user.email ?? '')
      setFirstName(user.user_metadata?.first_name ?? '')
      setLastName(user.user_metadata?.last_name ?? '')
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [router])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy('saving-name')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: err } = await supabase.auth.updateUser({
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
      })
      if (err) throw err
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis.')
    } finally {
      setBusy('idle')
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError('Kies een wachtwoord van minimaal 8 tekens.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('De wachtwoorden komen niet overeen.')
      return
    }
    setBusy('saving-password')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: err } = await supabase.auth.updateUser({ password: newPassword })
      if (err) throw err
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis.')
    } finally {
      setBusy('idle')
    }
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'VERWIJDEREN') return
    setError(null)
    setBusy('deleting')
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? `Verwijderen mislukt (${res.status})`)
      }
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis.')
      setBusy('idle')
    }
  }

  const inputClass =
    'w-full bg-cream-50 border border-cream-500 rounded-xl px-3.5 py-2.5 text-base text-ink-900 placeholder-ink-400 focus:outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 transition-all disabled:opacity-50'
  const btnPrimary =
    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clay-500 hover:bg-clay-600 disabled:bg-cream-400 text-white font-medium text-sm transition-colors disabled:cursor-not-allowed'
  const card = 'bg-cream-50 border border-cream-500 rounded-2xl p-6 space-y-4'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-200">
        <Loader2 size={20} className="animate-spin text-ink-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-200 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Terug-knop */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Terug
        </button>

        <h1 className="font-serif font-medium text-3xl text-ink-900 tracking-tight">Account</h1>

        {error && (
          <div className="px-4 py-3 bg-clay-500/10 border border-clay-500/30 rounded-xl text-sm text-clay-700">
            {error}
          </div>
        )}

        {/* ── Profiel ── */}
        <div className={card}>
          <h2 className="text-[10px] font-medium text-ink-500 uppercase tracking-[0.18em]">Profiel</h2>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">E-mailadres</label>
            <p className="text-sm text-ink-500 px-3.5 py-2.5 bg-cream-200 border border-cream-500 rounded-xl">
              {email}
            </p>
          </div>
          <form onSubmit={handleSaveName} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-xs font-medium text-ink-600 mb-1">Voornaam</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  disabled={busy !== 'idle'}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-xs font-medium text-ink-600 mb-1">Achternaam</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  disabled={busy !== 'idle'}
                />
              </div>
            </div>
            <button type="submit" className={btnPrimary} disabled={busy !== 'idle'}>
              {busy === 'saving-name' ? <Loader2 size={14} className="animate-spin" /> : nameSuccess ? <Check size={14} /> : null}
              {nameSuccess ? 'Opgeslagen' : 'Naam opslaan'}
            </button>
          </form>
        </div>

        {/* ── Wachtwoord ── */}
        <div className={card}>
          <h2 className="text-[10px] font-medium text-ink-500 uppercase tracking-[0.18em]">Wachtwoord wijzigen</h2>
          <form onSubmit={handleSavePassword} className="space-y-3">
            <div>
              <label htmlFor="newPw" className="block text-xs font-medium text-ink-600 mb-1">Nieuw wachtwoord</label>
              <input
                id="newPw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimaal 8 tekens"
                className={inputClass}
                disabled={busy !== 'idle'}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirmPw" className="block text-xs font-medium text-ink-600 mb-1">Bevestig wachtwoord</label>
              <input
                id="confirmPw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Herhaal wachtwoord"
                className={inputClass}
                disabled={busy !== 'idle'}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className={btnPrimary} disabled={busy !== 'idle' || !newPassword}>
              {busy === 'saving-password' ? <Loader2 size={14} className="animate-spin" /> : passwordSuccess ? <Check size={14} /> : null}
              {passwordSuccess ? 'Wachtwoord gewijzigd' : 'Wachtwoord opslaan'}
            </button>
          </form>
        </div>

        {/* ── Uitloggen ── */}
        <div className={card}>
          <h2 className="text-[10px] font-medium text-ink-500 uppercase tracking-[0.18em]">Sessie</h2>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm text-ink-600 hover:text-ink-900 transition-colors">
            <LogOut size={14} />
            Uitloggen
          </button>
        </div>

        {/* ── Danger zone ── */}
        <div className="bg-cream-50 border border-clay-500/30 rounded-2xl p-6 space-y-4">
          <h2 className="text-[10px] font-medium text-clay-700 uppercase tracking-[0.18em]">Gevaarzone</h2>
          {!showDeleteInput ? (
            <button
              onClick={() => setShowDeleteInput(true)}
              className="inline-flex items-center gap-2 text-sm text-clay-700 hover:text-clay-900 font-medium transition-colors"
            >
              <Trash2 size={14} />
              Account verwijderen
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-700 leading-relaxed">
                Dit verwijdert je account, alle sessies en klantprofielen permanent. Dit kan niet ongedaan gemaakt worden.
              </p>
              <p className="text-sm text-ink-700">
                Typ <span className="font-mono font-semibold">VERWIJDEREN</span> om te bevestigen:
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="VERWIJDEREN"
                className={inputClass}
                disabled={busy !== 'idle'}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'VERWIJDEREN' || busy !== 'idle'}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-cream-400 text-white font-medium text-sm transition-colors disabled:cursor-not-allowed"
                >
                  {busy === 'deleting' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Definitief verwijderen
                </button>
                <button
                  onClick={() => { setShowDeleteInput(false); setDeleteConfirm('') }}
                  className="text-sm text-ink-500 hover:text-ink-700 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
