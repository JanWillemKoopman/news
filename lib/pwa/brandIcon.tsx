import { ImageResponse } from 'next/og'
import { promises as fs } from 'fs'
import path from 'path'

// Gedeelde generator voor alle app-iconen: het witte ampersand-merkteken
// (public/logo.png) gecentreerd op een volvlak navy vlak (#2a4862). Wordt
// gebruikt door app/icon.tsx, app/apple-icon.tsx en de manifest-icoonroutes.
// `innerRatio` bepaalt hoe groot het merkteken is t.o.v. het canvas; voor
// maskable iconen houden we ~0.6 aan zodat het binnen de veilige zone valt.
export async function renderBrandIcon(sizePx: number, innerRatio = 0.66) {
  const logo = await fs.readFile(path.join(process.cwd(), 'public', 'logo.png'))
  const src = `data:image/png;base64,${logo.toString('base64')}`
  const inner = Math.round(sizePx * innerRatio)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2a4862',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={inner} height={inner} alt="" />
      </div>
    ),
    { width: sizePx, height: sizePx }
  )
}
