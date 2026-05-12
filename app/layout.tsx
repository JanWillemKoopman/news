import type { Metadata, Viewport } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-styrene',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK', 'opsz'],
})

export const metadata: Metadata = {
  title: 'Marketing Sessie',
  description:
    'Schakel een compleet AI-marketingteam in. Een Marketing Manager en zes specialisten helpen je met al je online marketingvraagstukken.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f0eee6',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans bg-cream-200 text-ink-700 min-h-screen">
        {children}
      </body>
    </html>
  )
}
