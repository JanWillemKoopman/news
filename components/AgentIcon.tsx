import {
  Sparkles,
  PenLine,
  Target,
  HeartHandshake,
  Megaphone,
  LineChart,
} from 'lucide-react'
import type { AgentId } from '@/types'

const ICON_MAP: Record<AgentId, React.ElementType> = {
  brand: Sparkles,
  content: PenLine,
  performance: Target,
  crm: HeartHandshake,
  ads: Megaphone,
  data: LineChart,
}

interface AgentIconProps {
  agentId: AgentId
  className?: string
}

export default function AgentIcon({ agentId, className }: AgentIconProps) {
  const Icon = ICON_MAP[agentId]
  return <Icon className={className} />
}
