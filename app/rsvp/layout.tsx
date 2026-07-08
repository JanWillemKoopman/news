import { WeddingFontsShell } from '@/components/website/WeddingFontsShell'

// Persoonlijke RSVP-link: zelfde fontset en .wedding-scope als de publieke
// trouwwebsite (app/trouwen/layout.tsx) — de pagina rendert immers dezelfde
// thema-renderer, zie app/rsvp/[token]/[[...pagina]]/page.tsx.
export default function RsvpLayout({ children }: { children: React.ReactNode }) {
  return <WeddingFontsShell>{children}</WeddingFontsShell>
}
