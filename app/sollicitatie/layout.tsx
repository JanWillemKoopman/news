import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sollicitatiebrief Helper',
  description: 'Upload je CV en de vacature — AI schrijft een sterke sollicitatiebrief in het Nederlands',
}

export default function SollicitatieLayout({ children }: { children: React.ReactNode }) {
  return children
}
