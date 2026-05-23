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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={`${inter.className} min-h-screen bg-white text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
