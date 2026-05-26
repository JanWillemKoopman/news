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

// De body heeft zelf geen achtergrond; elke (sub-)route zet die via een eigen
// wrapper (.wedding voor /bruiloft). De document-achtergrond is wit (gelijk
// aan het canvas binnen de app), zodat er geen lek ontstaat bij overscroll.

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2a4862',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" style={{ backgroundColor: '#ffffff' }}>
      <body className={`${inter.className} min-h-screen bg-white text-foreground antialiased`}>
        {children}
      </body>
    </html>
  )
}
