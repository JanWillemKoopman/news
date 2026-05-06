import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AgentId, Message, Phase } from '@/types'

interface ChatState {
  selectedAgents: AgentId[]
  messages: Message[]
  screen: 'selection' | 'chat'
  isTyping: boolean
  typingAgent: string | null
  phase: Phase
  debateTurnCount: number
  error: string | null
}

interface ChatActions {
  toggleAgent: (id: AgentId) => void
  startSession: () => void
  addMessage: (message: Message) => void
  setTyping: (isTyping: boolean, agentName?: string | null) => void
  setError: (error: string | null) => void
  setPhase: (phase: Phase) => void
  incrementDebateTurn: () => void
  resetDebateTurns: () => void
  resetSession: () => void
}

const initialState: ChatState = {
  selectedAgents: [],
  messages: [],
  screen: 'selection',
  isTyping: false,
  typingAgent: null,
  phase: 'intake',
  debateTurnCount: 0,
  error: null,
}

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set) => ({
      ...initialState,

      toggleAgent: (id) =>
        set((state) => {
          if (state.selectedAgents.includes(id)) {
            return { selectedAgents: state.selectedAgents.filter((a) => a !== id) }
          }
          if (state.selectedAgents.length >= 3) return state
          return { selectedAgents: [...state.selectedAgents, id] }
        }),

      startSession: () =>
        set({
          screen: 'chat',
          messages: [],
          phase: 'intake',
          debateTurnCount: 0,
          error: null,
        }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      setTyping: (isTyping, agentName) =>
        set({ isTyping, typingAgent: agentName ?? null }),

      setError: (error) => set({ error }),

      setPhase: (phase) => set({ phase }),

      incrementDebateTurn: () =>
        set((state) => ({ debateTurnCount: state.debateTurnCount + 1 })),

      resetDebateTurns: () => set({ debateTurnCount: 0 }),

      resetSession: () => set(initialState),
    }),
    {
      name: 'multi-agent-advisor-v2',
      partialize: (state) => ({
        selectedAgents: state.selectedAgents,
        messages: state.messages,
        screen: state.screen,
        phase: state.phase,
        debateTurnCount: state.debateTurnCount,
      }),
    }
  )
)
