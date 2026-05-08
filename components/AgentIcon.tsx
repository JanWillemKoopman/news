import Image from 'next/image'
import type { AgentId } from '@/types'

const PHOTO_MAP: Record<AgentId, string> = {
  brand: '/agents/daan_hofstra.png',
  content: '/agents/daan_hofstra.png',
  performance: '/agents/daan_hofstra.png',
  crm: '/agents/daan_hofstra.png',
  ads: '/agents/daan_hofstra.png',
  data: '/agents/daan_hofstra.png',
}

interface AgentIconProps {
  agentId: AgentId
  size?: number
}

export default function AgentIcon({ agentId, size = 32 }: AgentIconProps) {
  return (
    <Image
      src={PHOTO_MAP[agentId]}
      alt={agentId}
      width={size}
      height={size}
      className="w-full h-full object-cover"
    />
  )
}
