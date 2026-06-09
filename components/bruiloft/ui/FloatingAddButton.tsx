'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

interface FloatingAddButtonProps {
  label: string
  onClick: () => void
  visible: boolean
}

// Zwevende actieknop (FAB): ronde dusty-rose cirkel met een + die rechtsonder aan
// het scherm plakt. Verschijnt soepel zodra de primaire "toevoegen"-knop bovenaan
// uit beeld scrolt (zichtbaarheid wordt door de aanroeper bepaald). Op desktop
// toont hij een label bij hover; op mobiel alleen de cirkel.
export function FloatingAddButton({ label, onClick, visible }: FloatingAddButtonProps) {
  return (
    <div
      className={cn(
        'group fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center md:bottom-6 md:right-6',
        'transition-[opacity,transform] duration-300 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      )}
    >
      {/* Label verschijnt alleen op desktop bij hover. */}
      <span className="pointer-events-none mr-3 hidden whitespace-nowrap rounded-md bg-rhino-800 px-2.5 py-1.5 text-sm font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 md:block">
        {label}
      </span>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition-[transform,background-color] duration-150 ease-out hover:scale-105 hover:bg-rose-500 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
