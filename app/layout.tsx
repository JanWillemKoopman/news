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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#212121' },
  ],
}

// Runs before React hydrates: applies `dark` class from localStorage or
// system preference so the first paint matches the user's choice and no
// light→dark flash occurs.
const noFlashScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className={`${dmSans.className} bg-background text-foreground min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
