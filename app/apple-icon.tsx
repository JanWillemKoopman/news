import { renderBrandIcon } from '@/lib/pwa/brandIcon'

// Apple touch icon (iOS-beginscherm). Volvlak navy, geen transparantie: iOS
// rondt de hoeken zelf af en zou bij transparantie zwarte randen tonen.
export const runtime = 'nodejs'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return renderBrandIcon(180, 0.66)
}
