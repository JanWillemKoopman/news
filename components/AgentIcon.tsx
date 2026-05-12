import Image from 'next/image'
import type { AgentId } from '@/types'

const PHOTO_MAP: Record<AgentId, string> = {
  brand: '/agents/sanne.png',
  content: '/agents/daan.png',
  performance: '/agents/ravi.png',
  crm: '/agents/lotte.png',
  ads: '/agents/mark.png',
  data: '/agents/yara.png',
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
