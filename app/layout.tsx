import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Ons Trouwplan',
    template: '%s · Ons Trouwplan',
  },
  description: 'Plan jullie bruiloft samen — gasten, budget, taken, draaiboek en meer.',
}

// Sub-route layouts (trouwplanner, sollicitatie) set their own bg via a wrapper div,
// so the root slate-950 bg only affects the advisor app at /.

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F0EEE6',
}

// Zet vóór de eerste paint de achtergrond van het document (en de browserbalk)
// op de juiste themakleur. Voorkomt een wit lek bij overscroll/donkere modus.
const themeBootstrap = `(function(){try{var t=localStorage.getItem('bruiloft-thema');var c=t==='dark'?'#201f1e':'#F0EEE6';document.documentElement.style.backgroundColor=c;var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute('content',c)}}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={`${inter.className} min-h-screen text-foreground antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {children}
      </body>
    </html>
  )
}
