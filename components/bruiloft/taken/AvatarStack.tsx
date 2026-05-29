'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import type { WeddingMember } from '@/lib/bruiloft/types'

const PALET = [
  'bg-rose-200 text-rose-900',
  'bg-amber-200 text-amber-900',
  'bg-emerald-200 text-emerald-900',
  'bg-sky-200 text-sky-900',
  'bg-violet-200 text-violet-900',
  'bg-stone-300 text-stone-900',
]

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function bgFor(userId: string): string {
  return PALET[hashCode(userId) % PALET.length]
}

export function initialsFor(m: { displayName: string; email: string }): string {
  const name = m.displayName || m.email
  return name
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')
}

interface SingleAvatarProps {
  member: WeddingMember
  dim: string
}

function SingleAvatar({ member, dim }: SingleAvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  if (member.avatarUrl && !imgError) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.displayName || member.email}
        onError={() => setImgError(true)}
        className={cn('inline-flex shrink-0 rounded-full object-cover ring-2 ring-card', dim)}
      />
    )
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium ring-2 ring-card',
        dim,
        bgFor(member.userId)
      )}
    >
      {initialsFor(member)}
    </span>
  )
}

interface AvatarStackProps {
  members: WeddingMember[]
  size?: 'sm' | 'md'
  max?: number
  className?: string
}

export function AvatarStack({ members, size = 'sm', max = 3, className }: AvatarStackProps) {
  if (members.length === 0) return null
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  return (
    <div className={cn('flex items-center', className)}>
      {shown.map((m, i) => (
        <span key={m.userId} title={m.displayName || m.email} className={cn(i > 0 && '-ml-2')}>
          <SingleAvatar member={m} dim={dim} />
        </span>
      ))}
      {extra > 0 ? (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-medium ring-2 ring-card -ml-2',
            dim
          )}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  )
}
