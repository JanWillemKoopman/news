import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExampleLetter } from '@/types/cover-letter'

const MAX_CONTENT_CHARS = 8000

interface ExampleLetterState {
  letters: ExampleLetter[]
}

interface ExampleLetterActions {
  addLetter: (title: string, content: string) => void
  removeLetter: (id: string) => void
}

export const useExampleLetterStore = create<ExampleLetterState & ExampleLetterActions>()(
  persist(
    (set) => ({
      letters: [],

      addLetter: (title, content) =>
        set((state) => ({
          letters: [
            ...state.letters,
            {
              id: crypto.randomUUID(),
              title: title.trim() || `Voorbeeldbrief ${state.letters.length + 1}`,
              content: content.trim().slice(0, MAX_CONTENT_CHARS),
              createdAt: Date.now(),
            },
          ],
        })),

      removeLetter: (id) =>
        set((state) => ({ letters: state.letters.filter((l) => l.id !== id) })),
    }),
    { name: 'cover-letter-examples' }
  )
)
