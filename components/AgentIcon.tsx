import { Layers, Rocket, BarChart2, ShoppingCart, TrendingUp, Share2 } from 'lucide-react'
import type { AgentId } from '@/types'

const ICON_MAP: Record<AgentId, React.ElementType> = {
  jobs: Layers,
  musk: Rocket,
  gates: BarChart2,
  bezos: ShoppingCart,
  buffett: TrendingUp,
  zuckerberg: Share2,
}

interface AgentIconProps {
  agentId: AgentId
  className?: string
}

export default function AgentIcon({ agentId, className }: AgentIconProps) {
  const Icon = ICON_MAP[agentId]
  return <Icon className={className} />
}
