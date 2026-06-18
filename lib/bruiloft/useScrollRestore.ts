import * as React from 'react'
import { ScrollContainerContext } from './scroll-context'

export function useScrollRestore() {
  const ref = React.useContext(ScrollContainerContext)

  const save = React.useCallback((): number => {
    return ref?.current?.scrollTop ?? 0
  }, [ref])

  const restore = React.useCallback((pos: number): void => {
    // setTimeout geeft React tijd om de lijst te hersorteren en Radix
    // tijd om focus terug te geven voordat wij de scrollpositie overschrijven.
    setTimeout(() => {
      if (ref?.current) ref.current.scrollTop = pos
    }, 0)
  }, [ref])

  return { save, restore }
}
