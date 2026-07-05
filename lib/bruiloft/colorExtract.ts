// Client-side kleurenpalet-extractie uit een afbeelding (fase 4: geen
// nieuwe dependency, geen server-kosten). Laadt de foto in een onzichtbaar
// <canvas>, kwantiseert de pixels naar emmers en geeft de meest voorkomende,
// voldoende verzadigde kleuren terug als suggestie voor de accentkleur.
// Faalt stil (lege lijst) bij CORS-problemen of laadfouten — de UI toont
// dan simpelweg geen suggesties i.p.v. te crashen.

const DOWNSAMPLE = 80       // canvasgrootte: klein genoeg voor snelheid, groot genoeg voor representatieve steekproef
const KWANTISATIE_STAP = 32 // per kanaal afronden, zodat bijna-gelijke pixels in dezelfde emmer vallen

function hexNaarRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function kleurAfstand(a: string, b: string): number {
  const [r1, g1, b1] = hexNaarRgb(a)
  const [r2, g2, b2] = hexNaarRgb(b)
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

export function extraheerPaletUitAfbeelding(url: string, aantal = 4): Promise<string[]> {
  return new Promise((resolve) => {
    if (!url || typeof window === 'undefined') {
      resolve([])
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = DOWNSAMPLE
        canvas.height = DOWNSAMPLE
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve([])
          return
        }
        ctx.drawImage(img, 0, 0, DOWNSAMPLE, DOWNSAMPLE)
        const { data } = ctx.getImageData(0, 0, DOWNSAMPLE, DOWNSAMPLE)

        const emmers = new Map<string, { r: number; g: number; b: number; n: number }>()
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 200) continue
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const verzadiging = max === 0 ? 0 : (max - min) / max
          if (max > 240 && min > 225) continue // bijna wit
          if (max < 25) continue               // bijna zwart
          if (verzadiging < 0.12) continue      // te grijs voor een bruikbare accentkleur

          const key = `${Math.round(r / KWANTISATIE_STAP)}_${Math.round(g / KWANTISATIE_STAP)}_${Math.round(b / KWANTISATIE_STAP)}`
          const emmer = emmers.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
          emmer.r += r
          emmer.g += g
          emmer.b += b
          emmer.n += 1
          emmers.set(key, emmer)
        }

        const kandidaten = Array.from(emmers.values())
          .sort((a, b) => b.n - a.n)
          .slice(0, aantal * 4)
          .map((e) => {
            const r = Math.round(e.r / e.n)
            const g = Math.round(e.g / e.n)
            const b = Math.round(e.b / e.n)
            return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
          })

        // Voorkom bijna-identieke kleuren in de resultatenlijst.
        const resultaat: string[] = []
        for (const hex of kandidaten) {
          if (resultaat.some((h) => kleurAfstand(h, hex) < 40)) continue
          resultaat.push(hex)
          if (resultaat.length >= aantal) break
        }
        resolve(resultaat)
      } catch {
        resolve([])
      }
    }
    img.onerror = () => resolve([])
    img.src = url
  })
}
