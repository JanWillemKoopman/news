import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AgentId, Message } from '@/types'

interface ChatState {
  selectedAgents: AgentId[]
  messages: Message[]
  screen: 'selection' | 'chat'
  isTyping: boolean
  typingAgent: string | null
  questionCount: number
  sessionComplete: boolean
  error: string | null
}

interface ChatActions {
  toggleAgent: (id: AgentId) => void
  startSession: () => void
  addMessage: (message: Message) => void
  setTyping: (isTyping: boolean, agentName?: string | null) => void
  setError: (error: string | null) => void
  incrementQuestionCount: () => void
  completeSession: () => void
  resetSession: () => void
}

const initialState: ChatState = {
  selectedAgents: [],
  messages: [],
  screen: 'selection',
  isTyping: false,
  typingAgent: null,
  questionCount: 0,
  sessionComplete: false,
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
          questionCount: 0,
          sessionComplete: false,
          error: null,
        }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      setTyping: (isTyping, agentName) =>
        set({ isTyping, typingAgent: agentName ?? null }),

      setError: (error) => set({ error }),

      incrementQuestionCount: () =>
        set((state) => ({ questionCount: state.questionCount + 1 })),

      completeSession: () => set({ sessionComplete: true }),

      resetSession: () => set(initialState),
    }),
    {
      name: 'multi-agent-advisor-v1',
      partialize: (state) => ({
        selectedAgents: state.selectedAgents,
        messages: state.messages,
        screen: state.screen,
        questionCount: state.questionCount,
        sessionComplete: state.sessionComplete,
      }),
    }
  )
)
