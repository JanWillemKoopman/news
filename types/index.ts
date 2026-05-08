export type AgentId =
  | 'brand'
  | 'content'
  | 'performance'
  | 'crm'
  | 'ads'
  | 'data'

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

// 'intake'   = Campagne Manager interviewt de klant
// 'planning' = Specialisten werken samen aan het plan
// 'final'    = Compleet plan opgeleverd, klant kan bijsturen
export type Phase = 'intake' | 'planning' | 'final'

export interface Message {
  id: string
  role: 'user' | 'agent' | 'manager' | 'plan'
  agentId?: AgentId
  agentName?: string
  content: string
  timestamp: number
  phase?: Phase
}

export interface ConversationEntry {
  role: 'user' | 'model'
  content: string
}
