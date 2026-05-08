import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ALL_AGENT_IDS } from '@/lib/agents'
import type { AgentId, Message, Phase } from '@/types'

interface ChatState {
  selectedAgents: AgentId[]
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
  toggleAgent: (id: AgentId) => void
  selectAll: () => void
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
  // Standaard staat het volledige bureau aan; de klant kan specialisten uitvinken.
  selectedAgents: [...ALL_AGENT_IDS],
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

      toggleAgent: (id) =>
        set((state) => {
          if (state.selectedAgents.includes(id)) {
            return { selectedAgents: state.selectedAgents.filter((a) => a !== id) }
          }
          return { selectedAgents: [...state.selectedAgents, id] }
        }),

      selectAll: () => set({ selectedAgents: [...ALL_AGENT_IDS] }),

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

      resetSession: () =>
        set({
          ...initialState,
          // bewaar selectie zodat een nieuwe sessie dezelfde keuze houdt
          selectedAgents: [...ALL_AGENT_IDS],
        }),
    }),
    {
      name: 'marketing-bureau-v1',
      partialize: (state) => ({
        selectedAgents: state.selectedAgents,
        messages: state.messages,
        screen: state.screen,
        phase: state.phase,
        intakeRound: state.intakeRound,
        planningRound: state.planningRound,
      }),
    }
  )
)
