'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

interface FloatingAddButtonProps {
  label: string
  onClick: () => void
  visible: boolean
}

export function FloatingAddButton({ label, onClick, visible }: FloatingAddButtonProps) {
  return (
    <div
      className={cn(
        'group fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center md:bottom-6 md:right-6',
        'transition-[opacity,transform] duration-300 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      )}
    >
      <span className="pointer-events-none mr-3 hidden whitespace-nowrap rounded-md bg-rhino-800 px-2.5 py-1.5 text-sm font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 md:block">
        {label}
      </span>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600/85 text-white shadow-md backdrop-blur-sm transition-[transform,background-color,opacity] duration-150 ease-out hover:bg-rose-500 hover:opacity-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 md:h-14 md:w-14 md:bg-rose-600 md:shadow-lg md:backdrop-blur-none md:hover:scale-105"
      >
        <Plus className="h-5 w-5 md:h-6 md:w-6" />
      </button>
    </div>
  )
}
