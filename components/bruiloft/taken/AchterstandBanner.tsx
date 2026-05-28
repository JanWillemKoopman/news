'use client'

import * as React from 'react'
import { AlertTriangle, ArrowDown } from 'lucide-react'

import { Button } from '@/components/bruiloft/ui'

interface AchterstandBannerProps {
  aantal: number
  onSpringNaar: () => void
}

export function AchterstandBanner({ aantal, onSpringNaar }: AchterstandBannerProps) {
  if (aantal === 0) return null
  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-rose-600" />
        <p className="text-sm text-rose-900">
          <span className="font-medium">{aantal}</span>{' '}
          {aantal === 1 ? 'taak is achterstallig' : 'taken zijn achterstallig'}.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onSpringNaar} className="shrink-0">
        <ArrowDown className="h-4 w-4" /> Bekijk
      </Button>
    </div>
  )
}
