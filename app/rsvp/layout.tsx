import { ALL_FONT_VARIABLES } from '@/app/fonts'

import '../globals.css'

// Publieke RSVP-pagina: laadt alle whitelisted Google Fonts (één CSS-variabele
// per font). De ThemeProvider in de page rendert een geneste .wedding-scope
// en wijst de gekozen serif/sans toe aan --font-serif / --font-sans.
export default function RsvpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${ALL_FONT_VARIABLES} min-h-screen bg-rhino-50`}>{children}</div>
  )
}
