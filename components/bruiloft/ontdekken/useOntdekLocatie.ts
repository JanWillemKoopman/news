'use client'

import * as React from 'react'

import { STANDAARD_STRAAL } from '@/lib/bruiloft/discovery/geo'
import type { ZoekPlaats } from '@/lib/bruiloft/discovery/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Eén bron van waarheid voor "waar zoekt dit bruidspaar?" op de
// ontdekpagina's. De gekozen plaats + straal:
//   1. staan op de categoriepagina in de URL (deelbaar, overleeft refresh);
//   2. worden in localStorage bewaard zodat de keuze blijft staan bij het
//      wisselen van categorie en bij een volgend bezoek;
//   3. vallen bij een eerste bezoek stil terug op de woonplaats uit het
//      bruiloftsprofiel (via PDOK opgezocht) — de pagina werkt dan meteen
//      "in de buurt" zonder dat er iets ingetypt hoeft te worden.
//
// Bewust zonder useSearchParams: de URL wordt éénmalig bij mount gelezen en
// daarna via history.replaceState bijgehouden, zodat er geen Suspense-eisen
// of her-renders vanuit de router bijkomen.

const OPSLAG_SLEUTEL = 'bruiloft-ontdek-locatie'

interface OpgeslagenLocatie {
  plaats: ZoekPlaats | null
  straal: number
}

function leesOpslag(): OpgeslagenLocatie | null {
  try {
    const ruw = window.localStorage.getItem(OPSLAG_SLEUTEL)
    if (!ruw) return null
    const data = JSON.parse(ruw) as OpgeslagenLocatie
    if (data.plaats && (!Number.isFinite(data.plaats.lat) || !Number.isFinite(data.plaats.lon))) {
      return null
    }
    return data
  } catch {
    return null
  }
}

function schrijfOpslag(locatie: OpgeslagenLocatie) {
  try {
    window.localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(locatie))
  } catch {
    // Opslag vol/geblokkeerd: geen ramp, de sessie zelf werkt gewoon.
  }
}

function leesUrl(): OpgeslagenLocatie | null {
  const sp = new URLSearchParams(window.location.search)
  const naam = sp.get('plaats')?.trim()
  const lat = Number(sp.get('lat'))
  const lon = Number(sp.get('lon'))
  const straal = parseInt(sp.get('straal') ?? '', 10)
  if (!naam || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return {
    plaats: { naam, gemeente: '', provincie: '', lat, lon },
    straal: Number.isFinite(straal) && straal > 0 ? straal : STANDAARD_STRAAL,
  }
}

// Zet de gekozen locatie in de querystring van de huidige URL.
export function locatieQuery(plaats: ZoekPlaats | null, straal: number): string {
  if (!plaats) return ''
  const sp = new URLSearchParams({
    plaats: plaats.naam,
    lat: plaats.lat.toFixed(5),
    lon: plaats.lon.toFixed(5),
    straal: String(straal),
  })
  return `?${sp.toString()}`
}

interface UseOntdekLocatieOpties {
  // Alleen de categoriepagina spiegelt de locatie naar de URL; op de
  // overzichtspagina blijft de URL schoon.
  syncUrl?: boolean
}

export function useOntdekLocatie({ syncUrl = false }: UseOntdekLocatieOpties = {}) {
  const woonplaats = useBruiloftStore((s) => s.wedding?.woonplaats ?? '')

  const [geladen, setGeladen] = React.useState(false)
  const [plaats, setPlaatsState] = React.useState<ZoekPlaats | null>(null)
  const [straal, setStraalState] = React.useState<number>(STANDAARD_STRAAL)

  // Init: URL → localStorage → (async) woonplaats uit het profiel.
  React.useEffect(() => {
    const uitUrl = syncUrl ? leesUrl() : null
    const init = uitUrl ?? leesOpslag()
    if (init) {
      setPlaatsState(init.plaats)
      setStraalState(init.straal)
    }
    setGeladen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stille prefill met de profiel-woonplaats zodra duidelijk is dat er nog
  // geen eigen keuze bestaat (niet in URL, niet in opslag).
  const prefillGeprobeerd = React.useRef(false)
  React.useEffect(() => {
    if (!geladen || plaats || !woonplaats || prefillGeprobeerd.current) return
    prefillGeprobeerd.current = true
    let actueel = true
    ;(async () => {
      try {
        const res = await fetch(`/api/ontdekken/plaatsen?q=${encodeURIComponent(woonplaats)}`)
        if (!res.ok) return
        const data = (await res.json()) as { suggesties?: { id: string; naam: string }[] }
        const match = data.suggesties?.find(
          (s) => s.naam.toLowerCase() === woonplaats.trim().toLowerCase()
        )
        if (!match) return
        const lookup = await fetch(`/api/ontdekken/plaatsen?id=${encodeURIComponent(match.id)}`)
        if (!lookup.ok) return
        const { plaats: gevonden } = (await lookup.json()) as { plaats?: ZoekPlaats }
        if (actueel && gevonden) setPlaatsState(gevonden)
      } catch {
        // Prefill is best-effort; de zoekbalk blijft gewoon leeg.
      }
    })()
    return () => {
      actueel = false
    }
  }, [geladen, plaats, woonplaats])

  // Elke wijziging doorvoeren naar opslag + (optioneel) URL.
  React.useEffect(() => {
    if (!geladen) return
    schrijfOpslag({ plaats, straal })
    if (syncUrl) {
      const query = locatieQuery(plaats, straal)
      const url = `${window.location.pathname}${query}`
      window.history.replaceState(window.history.state, '', url)
    }
  }, [plaats, straal, geladen, syncUrl])

  return {
    geladen,
    plaats,
    straal,
    setPlaats: setPlaatsState,
    setStraal: setStraalState,
  }
}
