import { renderBrandIcon } from '@/lib/pwa/brandIcon'

// Manifest-icoon 512×512 (purpose: any).
export const runtime = 'nodejs'

export function GET() {
  return renderBrandIcon(512, 0.66)
}
