import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ALL_AGENT_IDS } from '@/lib/agents'
import type { Message, Phase } from '@/types'

interface ChatState {
  messages: Message[]
  screen: 'selection' | 'chat'
  isTyping: boolean
  typingAgent: string | null
  phase: Phase
  intakeRound: number
  planningRound: number
  error: string | null
}

interface ChatActions {
  startSession: () => void
  addMessage: (message: Message) => void
  setTyping: (isTyping: boolean, agentName?: string | null) => void
  setError: (error: string | null) => void
  setPhase: (phase: Phase) => void
  incrementIntakeRound: () => void
  incrementPlanningRound: () => void
  resetSession: () => void
}

const initialState: ChatState = {
  messages: [],
  screen: 'selection',
  isTyping: false,
  typingAgent: null,
  phase: 'intake',
  intakeRound: 0,
  planningRound: 0,
  error: null,
}

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set) => ({
      ...initialState,

      startSession: () =>
        set({
          screen: 'chat',
          messages: [],
          phase: 'intake',
          intakeRound: 0,
          planningRound: 0,
          error: null,
        }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      setTyping: (isTyping, agentName) =>
        set({ isTyping, typingAgent: agentName ?? null }),

      setError: (error) => set({ error }),

      setPhase: (phase) => set({ phase }),

      incrementIntakeRound: () =>
        set((state) => ({ intakeRound: state.intakeRound + 1 })),

      incrementPlanningRound: () =>
        set((state) => ({ planningRound: state.planningRound + 1 })),

      resetSession: () => set(initialState),
    }),
    {
      name: 'marketing-bureau-v1',
      partialize: (state) => ({
        messages: state.messages,
        screen: state.screen,
        phase: state.phase,
        intakeRound: state.intakeRound,
        planningRound: state.planningRound,
      }),
    }
  )
)

// Voor backwards compat / informatieve UI: het bureau-team is altijd compleet.
export const BUREAU_TEAM = ALL_AGENT_IDS
