import { create } from 'zustand'
import type { LetterMessage } from '@/types/sollicitatie'

export const MAX_QUESTIONS = 4

interface LetterState {
  cvText: string | null
  vacancyText: string
  messages: LetterMessage[]
  screen: 'intake' | 'chat'
  isTyping: boolean
  typingLabel: string | null
  questionCount: number
  sessionComplete: boolean
  error: string | null
}

interface LetterActions {
  setCvText: (text: string) => void
  setVacancyText: (text: string) => void
  goToChat: () => void
  addMessage: (message: LetterMessage) => void
  setTyping: (isTyping: boolean, label?: string | null) => void
  setError: (error: string | null) => void
  incrementQuestionCount: () => void
  completeSession: () => void
  resetSession: () => void
}

const initialState: LetterState = {
  cvText: null,
  vacancyText: '',
  messages: [],
  screen: 'intake',
  isTyping: false,
  typingLabel: null,
  questionCount: 0,
  sessionComplete: false,
  error: null,
}

export const useLetterStore = create<LetterState & LetterActions>()((set) => ({
  ...initialState,

  setCvText: (cvText) => set({ cvText }),

  setVacancyText: (vacancyText) => set({ vacancyText }),

  goToChat: () => set({ screen: 'chat' }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  setTyping: (isTyping, label) => set({ isTyping, typingLabel: label ?? null }),

  setError: (error) => set({ error }),

  incrementQuestionCount: () => set((state) => ({ questionCount: state.questionCount + 1 })),

  completeSession: () => set({ sessionComplete: true }),

  resetSession: () => set(initialState),
}))
