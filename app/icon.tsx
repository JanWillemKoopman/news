import { renderBrandIcon } from '@/lib/pwa/brandIcon'

// Browser-favicon: navy vlak met het witte ampersand-merkteken.
export const runtime = 'nodejs'
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return renderBrandIcon(64, 0.66)
}
