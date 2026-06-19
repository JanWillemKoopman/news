import * as React from 'react'

// SSR-veilige media-query hook. Start met `false` zodat server- en eerste
// client-render overeenkomen (geen hydration-mismatch); de echte waarde wordt
// na mount in een effect gezet en bij wijzigingen bijgewerkt.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])

  return matches
}
