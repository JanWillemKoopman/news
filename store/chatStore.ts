import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ALL_AGENT_IDS } from '@/lib/agents'
import type { AgentId, CompanyProfile, Message, Phase } from '@/types'

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
  companyProfile: CompanyProfile | null
}

interface ChatActions {
  toggleAgent: (id: AgentId) => void
  selectAll: () => void
  startSession: () => void
  addMessage: (message: Message) => void
  updateMessageContent: (id: string, content: string) => void
  setTyping: (isTyping: boolean, agentName?: string | null) => void
  setError: (error: string | null) => void
  setPhase: (phase: Phase) => void
  incrementIntakeRound: () => void
  incrementPlanningRound: () => void
  resetSession: () => void
  setCompanyProfile: (profile: CompanyProfile | null) => void
}

const initialState: ChatState = {
  selectedAgents: [],
  messages: [],
  screen: 'selection',
  isTyping: false,
  typingAgent: null,
  phase: 'intake',
  intakeRound: 0,
  planningRound: 0,
  error: null,
  companyProfile: null,
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

      updateMessageContent: (id, content) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, content } : m
          ),
        })),

      setTyping: (isTyping, agentName) =>
        set({ isTyping, typingAgent: agentName ?? null }),

      setError: (error) => set({ error }),

      setPhase: (phase) => set({ phase }),

      incrementIntakeRound: () =>
        set((state) => ({ intakeRound: state.intakeRound + 1 })),

      incrementPlanningRound: () =>
        set((state) => ({ planningRound: state.planningRound + 1 })),

      resetSession: () =>
        set((state) => ({
          ...initialState,
          companyProfile: state.companyProfile,
        })),

      setCompanyProfile: (companyProfile) => set({ companyProfile }),
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
