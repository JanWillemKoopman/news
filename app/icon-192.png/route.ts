import { renderBrandIcon } from '@/lib/pwa/brandIcon'

// Manifest-icoon 192×192 (purpose: any).
export const runtime = 'nodejs'

export function GET() {
  return renderBrandIcon(192, 0.66)
}
