import type { MetadataRoute } from 'next'

// Web app manifest — maakt de app installeerbaar (eigen icoon, standalone
// launch, splash via background_color + icoon, navy themekleur). Next serveert
// dit op /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ons Trouwplan',
    short_name: 'Trouwplan',
    description: 'Plan jullie bruiloft samen — gasten, budget, taken, draaiboek en meer.',
    start_url: '/bruiloft',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'nl',
    background_color: '#ffffff',
    theme_color: '#2a4862',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
