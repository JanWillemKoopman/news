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
    <html lang="nl" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        {/* Stel dark class in vóór eerste render om Flash of Wrong Theme te voorkomen */}
        <script dangerouslySetInnerHTML={{ __html:
          `try{if(localStorage.getItem('marketing-bureau-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`
        }} />
      </head>
      <body className="font-sans bg-cream-200 text-ink-700 min-h-screen">
        {children}
      </body>
    </html>
  )
}
