import * as React from 'react'

import { SANS_CSS_VAR, SERIF_CSS_VAR } from '@/app/fonts'
import { DEFAULT_THEME, type ThemeConfig } from '@/lib/bruiloft/theme'

// Wikkelt children in een .wedding-scope en overschrijft daarbinnen de
// CSS-variabelen op basis van het ThemeConfig-object. De .wedding-block in
// globals.css blijft de fallback voor alles wat we hier niet zetten.
//
// Inline `<style scoped>` per render werkt prima omdat de wrapper toch al
// per pagina bestaat; we serveren één blok van ~600 bytes met de override.
export function ThemeProvider({
  theme,
  className,
  children,
}: {
  theme: ThemeConfig | null | undefined
  className?: string
  children: React.ReactNode
}) {
  const t = theme ?? DEFAULT_THEME
  const c = t.colors

  // Per-instance unieke class zodat meerdere ThemeProviders op één pagina
  // (bv. live-preview + opgeslagen versie) elkaar niet overschrijven.
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const scope = `theme-${id}`

  const css = `
.${scope} {
  --background: ${c.background};
  --foreground: ${c.foreground};
  --card: ${c.background};
  --card-foreground: ${c.foreground};
  --popover: ${c.background};
  --popover-foreground: ${c.foreground};
  --primary: ${c.primary};
  --primary-foreground: ${c.primary_foreground};
  --secondary: ${c.muted};
  --secondary-foreground: ${c.foreground};
  --muted: ${c.muted};
  --muted-foreground: ${c.muted_foreground};
  --accent: ${c.accent};
  --accent-foreground: ${c.foreground};
  --border: ${c.border};
  --input: ${c.border};
  --ring: ${c.primary};
  --radius: ${t.radius};
  --header-bg: ${c.header_bg};
  --header-fg: ${c.header_fg};
  --header-muted: ${c.header_fg};
  --font-serif: ${SERIF_CSS_VAR[t.fonts.serif]};
  --font-sans: ${SANS_CSS_VAR[t.fonts.sans]};
  font-family: var(--font-sans);
}
`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className={`wedding ${scope}${className ? ` ${className}` : ''}`}>{children}</div>
    </>
  )
}
