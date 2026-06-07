import { renderBrandIcon } from '@/lib/pwa/brandIcon'

// Maskable manifest-icoon 512×512: het merkteken blijft binnen de centrale
// veilige zone (~60%) zodat Android het kan bijsnijden tot elke vorm, met
// volvlak navy bleed naar de randen.
export const runtime = 'nodejs'

export function GET() {
  return renderBrandIcon(512, 0.6)
}
