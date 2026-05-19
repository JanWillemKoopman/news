import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'The Ultimate Cover Letter Agent',
  description: 'AI-powered sollicitatiebrief op basis van je CV en de vacature',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f0eee6',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={`${dmSans.className} bg-background text-foreground min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
