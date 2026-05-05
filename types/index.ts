export type AgentId = 'jobs' | 'musk' | 'gates' | 'bezos' | 'buffett' | 'zuckerberg'

export interface Agent {
  id: AgentId
  name: string
  title: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  glowColor: string
}

export interface Message {
  id: string
  role: 'user' | 'agent' | 'moderator' | 'final'
  agentId?: AgentId
  agentName?: string
  content: string
  timestamp: number
}

export interface ConversationEntry {
  role: 'user' | 'model'
  content: string
}
