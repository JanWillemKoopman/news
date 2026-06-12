import { Cormorant_Garamond } from 'next/font/google'

import { ToastProvider } from '@/components/bruiloft/ui'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

export default function SignupFlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wedding ${cormorant.variable} text-foreground`}>
      <ToastProvider>{children}</ToastProvider>
    </div>
  )
}
