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
  longDescription: string
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

export interface CompanyProfile {
  user_id?: string
  name: string
  industry: string
  description: string
  channels: string[]
  expertise: string[]
  website?: string | null
  audience?: string | null
  usp?: string | null
  tools?: string | null
  budget?: string | null
  tone_of_voice?: string | null
  competitors?: string | null
  goals?: string | null
  updated_at?: string
}

export const CHANNEL_OPTIONS = [
  'Meta Ads',
  'Google Ads',
  'LinkedIn',
  'E-mail',
  'SEO',
  'Content / blog',
  'Organic social',
  'Events',
  'Podcast',
  'Anders',
] as const

export const EXPERTISE_OPTIONS = [
  'Ontwerp',
  'Copywriting',
  'Video',
  'Web-development',
  'Performance marketing',
  'Data / analytics',
  'Anders',
] as const

export interface ChatSession {
  id: string
  title: string
  preview: string | null
  phase: Phase
  intake_round: number
  planning_round: number
  selected_agents: AgentId[]
  messages: Message[]
  company_profile_snapshot: CompanyProfile | null
  created_at: string
  updated_at: string
}

export type ChatSessionSummary = Pick<
  ChatSession,
  'id' | 'title' | 'preview' | 'phase' | 'updated_at' | 'created_at'
>
