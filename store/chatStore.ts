import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ALL_AGENT_IDS, MANAGER_NAME } from '@/lib/agents'
import type {
  AgentId,
  ChatSession,
  ClientProfile,
  Message,
  Phase,
} from '@/types'

function buildWelcomeMessage(firstName?: string): Message {
  const greeting = firstName
    ? `Hoi ${firstName}! Wij helpen je graag verder met je online marketing. Waar kunnen we je mee helpen?`
    : `Hoi! Wij helpen je graag verder met je online marketing. Waar kunnen we je mee helpen?`
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `welcome-${Date.now()}`,
    role: 'manager',
    content: greeting,
    timestamp: Date.now(),
    phase: 'intake',
  }
}

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
  currentClientProfile: ClientProfile | null
  currentSessionId: string | null
}

interface ChatActions {
  toggleAgent: (id: AgentId) => void
  selectAll: () => void
  startSession: (clientProfile?: ClientProfile | null, firstName?: string) => void
  addMessage: (message: Message) => void
  updateMessageContent: (id: string, content: string) => void
  setTyping: (isTyping: boolean, agentName?: string | null) => void
  setError: (error: string | null) => void
  setPhase: (phase: Phase) => void
  incrementIntakeRound: () => void
  incrementPlanningRound: () => void
  resetSession: () => void
  setCurrentClientProfile: (profile: ClientProfile | null) => void
  setCurrentSessionId: (id: string | null) => void
  hydrateFromSession: (session: ChatSession) => void
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
  currentClientProfile: null,
  currentSessionId: null,
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

      startSession: (clientProfile, firstName) =>
        set({
          screen: 'chat',
          messages: [buildWelcomeMessage(firstName)],
          phase: 'intake',
          intakeRound: 0,
          planningRound: 0,
          error: null,
          currentSessionId: null,
          currentClientProfile: clientProfile ?? null,
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

      resetSession: () => set({ ...initialState }),

      setCurrentClientProfile: (currentClientProfile) => set({ currentClientProfile }),

      setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),

      hydrateFromSession: (session) =>
        set({
          screen: 'chat',
          messages: session.messages ?? [],
          phase: session.phase,
          intakeRound: session.intake_round,
          planningRound: session.planning_round,
          selectedAgents: session.selected_agents ?? [],
          currentSessionId: session.id,
          currentClientProfile: session.company_profile_snapshot ?? null,
          isTyping: false,
          typingAgent: null,
          error: null,
        }),
    }),
    {
      name: 'marketing-bureau-v1',
      partialize: (state) => ({
        messages: state.messages,
        screen: state.screen,
        phase: state.phase,
        intakeRound: state.intakeRound,
        planningRound: state.planningRound,
        currentSessionId: state.currentSessionId,
        currentClientProfile: state.currentClientProfile,
      }),
    }
  )
)
