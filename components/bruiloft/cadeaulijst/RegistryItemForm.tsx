'use client'

import * as React from 'react'
import { Loader2, Upload, X } from 'lucide-react'

import { useBruiloftStore } from '@/store/bruiloftStore'
import {
  Button,
  Field,
  Input,
  MeerDetails,
  Modal,
  Textarea,
  useToast,
} from '@/components/bruiloft/ui'
import type { RegistryItem } from '@/lib/bruiloft/types'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: RegistryItem | null
}

const SUGGESTED_OPTIONS = [
  { label: '€10', value: 1000 },
  { label: '€25', value: 2500 },
  { label: '€50', value: 5000 },
  { label: '€100', value: 10000 },
]

export function RegistryItemForm({ open, onOpenChange, initial }: Props) {
  const addRegistryItem = useBruiloftStore((s) => s.addRegistryItem)
  const updateRegistryItem = useBruiloftStore((s) => s.updateRegistryItem)
  const uploadRegistryItemImage = useBruiloftStore((s) => s.uploadRegistryItemImage)
  const { toast } = useToast()

  const [type, setType] = React.useState<'gift' | 'fund'>('gift')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [imageUrl, setImageUrl] = React.useState('')
  const [shopUrl, setShopUrl] = React.useState('')
  const [targetAmount, setTargetAmount] = React.useState('')
  const [suggestedAmounts, setSuggestedAmounts] = React.useState<number[]>([2500, 5000])
  const [customSuggested, setCustomSuggested] = React.useState('')
  const [paymentLink, setPaymentLink] = React.useState('')
  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setType(initial?.type ?? 'gift')
      setTitle(initial?.title ?? '')
      setDescription(initial?.description ?? '')
      setImageUrl(initial?.imageUrl ?? '')
      setShopUrl(initial?.shopUrl ?? '')
      setTargetAmount(initial?.targetAmount != null ? String(initial.targetAmount / 100) : '')
      setSuggestedAmounts(initial?.suggestedAmounts ?? [2500, 5000])
      setCustomSuggested('')
      setPaymentLink(initial?.paymentLink ?? '')
      setImageFile(null)
      setImagePreview(null)
      setErrors({})
      setDetailsOpen(!!initial)
    }
  }, [open, initial])

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Maximaal 5 MB toegestaan.' }))
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: 'Alleen JPG, PNG of WebP.' }))
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setErrors((prev) => ({ ...prev, image: '' }))
  }

  const toggleSuggested = (value: number) => {
    setSuggestedAmounts((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Titel is verplicht.'
    if (type === 'fund') {
      const amt = parseFloat(targetAmount)
      if (!targetAmount || isNaN(amt) || amt < 1) errs.targetAmount = 'Voer een geldig streefbedrag in (minimaal €1).'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      let finalImageUrl = imageUrl

      if (imageFile) {
        setUploading(true)
        finalImageUrl = await uploadRegistryItemImage(imageFile)
        setUploading(false)
      }

      const allSuggested = [...suggestedAmounts]
      if (customSuggested) {
        const customCents = Math.round(parseFloat(customSuggested) * 100)
        if (!isNaN(customCents) && customCents > 0 && !allSuggested.includes(customCents)) {
          allSuggested.push(customCents)
        }
      }

      const data = {
        type,
        title: title.trim(),
        description: description.trim(),
        imageUrl: finalImageUrl,
        shopUrl: type === 'gift' ? shopUrl.trim() : '',
        targetAmount: type === 'fund' ? Math.round(parseFloat(targetAmount) * 100) : null,
        suggestedAmounts: type === 'fund' ? allSuggested.sort((a, b) => a - b) : [],
        paymentLink: type === 'fund' ? paymentLink.trim() : '',
        sortOrder: initial?.sortOrder ?? 0,
        isVisible: initial?.isVisible ?? true,
        weddingId: initial?.weddingId ?? '',
      }

      if (initial) {
        await updateRegistryItem(initial.id, data)
        toast({ title: 'Item bijgewerkt', variant: 'success' })
      } else {
        await addRegistryItem(data)
        toast({ title: 'Item toegevoegd', variant: 'success' })
      }
      onOpenChange(false)
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Item bewerken' : 'Item toevoegen'}
      className="sm:max-w-xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit" form="registry-item-form" loading={saving}>
            {initial ? 'Opslaan' : 'Toevoegen'}
          </Button>
        </div>
      }
    >
      <form id="registry-item-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Type toggle */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Type</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('gift')}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${type === 'gift' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-border text-muted-foreground hover:border-rose-300'}`}
            >
              Cadeauwens
            </button>
            <button
              type="button"
              onClick={() => setType('fund')}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${type === 'fund' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-border text-muted-foreground hover:border-rose-300'}`}
            >
              Geldfonds
            </button>
          </div>
        </div>

        <Field label="Titel" required error={errors.title}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'gift' ? 'bv. KitchenAid staafmixer' : 'bv. Huwelijksreis'}
          />
        </Field>

        {type === 'fund' && (
          <Field label="Streefbedrag (€)" required error={errors.targetAmount}>
            <Input
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="500"
              type="number"
              min="1"
              step="1"
            />
          </Field>
        )}

        <MeerDetails open={detailsOpen} onToggle={() => setDetailsOpen((v) => !v)}>
          <Field label="Omschrijving">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optionele toelichting voor jullie gasten..."
            />
          </Field>

          {/* Afbeelding */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Afbeelding</p>
            <div className="flex gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 transition-colors">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploaden…' : 'Afbeelding uploaden'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageFile} />
              </label>
            </div>
            {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
            {(imagePreview ?? imageUrl) && (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview ?? imageUrl} alt="" className="h-24 w-24 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); setImageUrl('') }}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-background border border-border p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">of</span>
              <div className="flex-1 border-t border-border" />
            </div>
            <Input
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setImageFile(null); setImagePreview(null) }}
              placeholder="https://..."
            />
          </div>

          {type === 'gift' && (
            <Field label="Link naar webshop">
              <Input
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
                placeholder="https://bol.com/..."
                type="url"
              />
            </Field>
          )}

          {type === 'fund' && (
            <>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Gesuggereerde bijdragebedragen</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleSuggested(opt.value)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${suggestedAmounts.includes(opt.value) ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-border text-muted-foreground hover:border-rose-300'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Aangepast bedrag (€):</span>
                  <Input
                    value={customSuggested}
                    onChange={(e) => setCustomSuggested(e.target.value)}
                    placeholder="75"
                    type="number"
                    min="1"
                    className="w-24"
                  />
                </div>
              </div>

              <Field label="Betaallink (optioneel)">
                <Input
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  placeholder="https://tikkie.me/..."
                  type="url"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Maak een Tikkie aan en plak de link hier. Gasten worden direct doorgestuurd.
                </p>
              </Field>
            </>
          )}
        </MeerDetails>
      </form>
    </Modal>
  )
}
