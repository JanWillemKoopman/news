import { Cormorant_Garamond } from 'next/font/google'

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
      {children}
    </div>
  )
}
