import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Ultimate Cover Letter Agent',
  description:
    'Multi-agent AI die op basis van je CV en de vacature een hoog-converterende sollicitatiebrief schrijft.',
}

export default function SollicitatieLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark min-h-screen bg-background text-foreground">{children}</div>
}
