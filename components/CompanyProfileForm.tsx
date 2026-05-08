'use client'

import { useState } from 'react'
import { ChevronDown, Loader2, Save, ArrowRight } from 'lucide-react'
import {
  CHANNEL_OPTIONS,
  EXPERTISE_OPTIONS,
  type CompanyProfile,
} from '@/types'

interface Props {
  initial?: Partial<CompanyProfile> | null
  onSaved: (profile: CompanyProfile) => void
  onSkip?: () => void
}

const EMPTY: CompanyProfile = {
  name: '',
  industry: '',
  description: '',
  channels: [],
  expertise: [],
  website: '',
  audience: '',
  usp: '',
  tools: '',
  budget: '',
  tone_of_voice: '',
  competitors: '',
  goals: '',
}

export default function CompanyProfileForm({ initial, onSaved, onSkip }: Props) {
  const [profile, setProfile] = useState<CompanyProfile>({ ...EMPTY, ...initial })
  const [moreOpen, setMoreOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }))
  }

  function toggleArr(key: 'channels' | 'expertise', value: string) {
    setProfile((p) => {
      const arr = p[key] || []
      return {
        ...p,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!profile.name.trim() || !profile.industry.trim() || !profile.description.trim()) {
      setError('Vul minimaal bedrijfsnaam, branche en korte omschrijving in.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Opslaan mislukt')
      }
      const data = await res.json()
      onSaved(data.profile as CompanyProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field
        label="Bedrijfsnaam"
        required
        value={profile.name}
        onChange={(v) => update('name', v)}
        placeholder="bv. Studio Hollandia"
      />
      <Field
        label="Branche / sector"
        required
        value={profile.industry}
        onChange={(v) => update('industry', v)}
        placeholder="bv. duurzame mode, B2B SaaS, horeca"
      />
      <Textarea
        label="Korte omschrijving"
        required
        value={profile.description}
        onChange={(v) => update('description', v)}
        placeholder="In 1-2 zinnen: wat doet je bedrijf en voor wie?"
        rows={2}
      />

      <ChipGroup
        label="Marketingkanalen die je nu inzet"
        options={CHANNEL_OPTIONS as readonly string[]}
        selected={profile.channels}
        onToggle={(v) => toggleArr('channels', v)}
      />
      <ChipGroup
        label="Expertise in huis"
        options={EXPERTISE_OPTIONS as readonly string[]}
        selected={profile.expertise}
        onToggle={(v) => toggleArr('expertise', v)}
      />

      <button
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        className="flex items-center gap-2 text-sm font-medium text-clay-600 hover:text-clay-700 transition-colors"
      >
        <ChevronDown
          size={16}
          className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`}
        />
        {moreOpen ? 'Minder details' : 'Meer details (optioneel)'}
      </button>

      {moreOpen && (
        <div className="space-y-5 pt-2 border-t border-cream-500 animate-fade-in">
          <Field
            label="Website"
            value={profile.website || ''}
            onChange={(v) => update('website', v)}
            placeholder="https://"
          />
          <Textarea
            label="Doelgroep(en)"
            value={profile.audience || ''}
            onChange={(v) => update('audience', v)}
            placeholder="Wie wil je bereiken? Demografie, gedrag, segmenten."
          />
          <Textarea
            label="USP / positionering"
            value={profile.usp || ''}
            onChange={(v) => update('usp', v)}
            placeholder="Waarom kiezen klanten voor jullie?"
          />
          <Textarea
            label="Tools / stack"
            value={profile.tools || ''}
            onChange={(v) => update('tools', v)}
            placeholder="CRM, e-mailplatform, analytics, CMS, ..."
          />
          <Field
            label="Budget-richting"
            value={profile.budget || ''}
            onChange={(v) => update('budget', v)}
            placeholder='bv. "€2-5k/maand"'
          />
          <Textarea
            label="Tone of voice / merkrichtlijnen"
            value={profile.tone_of_voice || ''}
            onChange={(v) => update('tone_of_voice', v)}
            placeholder="Hoe klinkt het merk?"
          />
          <Textarea
            label="Belangrijkste concurrenten"
            value={profile.competitors || ''}
            onChange={(v) => update('competitors', v)}
            placeholder="Met wie vergelijken klanten jullie?"
          />
          <Textarea
            label="Algemene business-doelen"
            value={profile.goals || ''}
            onChange={(v) => update('goals', v)}
            placeholder="Waar wil het bedrijf de komende 12 maanden naartoe?"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-clay-700 bg-clay-100/60 border border-clay-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-ink-500 hover:text-ink-700 transition-colors"
          >
            Overslaan voor nu →
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className={[
            'flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all duration-200',
            busy
              ? 'bg-cream-400 text-ink-400 cursor-not-allowed'
              : 'bg-clay-500 hover:bg-clay-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5',
          ].join(' ')}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Profiel opslaan
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-ink-500 uppercase tracking-[0.15em] mb-2">
        {label} {required && <span className="text-clay-600">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-cream-50 border border-cream-500 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 outline-none rounded-xl px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 transition-all"
      />
    </div>
  )
}

function Textarea({
  label,
  required,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-ink-500 uppercase tracking-[0.15em] mb-2">
        {label} {required && <span className="text-clay-600">*</span>}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-cream-50 border border-cream-500 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 outline-none rounded-xl px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 transition-all resize-none leading-relaxed"
      />
    </div>
  )
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-ink-500 uppercase tracking-[0.15em] mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150',
                on
                  ? 'bg-clay-500/15 border-clay-500/40 text-clay-700'
                  : 'bg-cream-50 border-cream-500 text-ink-500 hover:border-cream-600',
              ].join(' ')}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
