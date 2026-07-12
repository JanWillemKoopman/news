// Domeinhelpers voor de muzieklijst: de vaste momenten (secties), labels en
// kleine afgeleiden die zowel de plannerpagina als de publieke DJ-pagina
// gebruiken.

import type { MusicTrack, MuziekMoment, PublicMuziekTrack } from './types'

export interface MuziekMomentDef {
  value: MuziekMoment
  label: string
  // Eén zin die de lege sectie uitlegt — verschijnt alleen zolang er nog
  // niets in staat.
  hint: string
}

// Volgorde = volgorde van de dag; 'niet_draaien' sluit af als aparte
// afspraken-met-de-DJ-lijst.
export const MUZIEK_MOMENTEN: MuziekMomentDef[] = [
  {
    value: 'ceremonie',
    label: 'Ceremonie',
    hint: 'Binnenkomst, het ja-woord en het uitlopen — meestal 3 à 5 nummers.',
  },
  {
    value: 'borrel',
    label: 'Borrel & receptie',
    hint: 'Achtergrondmuziek voor het felicitatiemoment en de toost.',
  },
  {
    value: 'diner',
    label: 'Diner',
    hint: 'Rustige nummers op de achtergrond tijdens het eten en de speeches.',
  },
  {
    value: 'feest',
    label: 'Feest',
    hint: 'De openingsdans en alles wat de dansvloer vol houdt.',
  },
  {
    value: 'niet_draaien',
    label: 'Niet draaien',
    hint: 'Nummers die de DJ moet overslaan — ook als een gast erom vraagt.',
  },
]

const LABELS = new Map(MUZIEK_MOMENTEN.map((m) => [m.value, m.label]))

export function muziekMomentLabel(moment: MuziekMoment): string {
  return LABELS.get(moment) ?? moment
}

// Zoeklink naar Spotify — bewust geen API-koppeling: een link is genoeg om
// het nummer te vinden en werkt zonder keys of rate limits.
export function spotifyZoekUrl(titel: string, artiest: string): string {
  const query = [titel, artiest].filter(Boolean).join(' ')
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`
}

// Weergaveregel "Titel — Artiest" (artiest alleen als die ingevuld is).
export function trackRegel(t: Pick<MusicTrack | PublicMuziekTrack, 'titel' | 'artiest'>): string {
  return t.artiest ? `${t.titel} — ${t.artiest}` : t.titel
}

// Groepeer op moment in de vaste dagvolgorde (binnen een moment: volgorde,
// dan invoermoment). Werkt voor zowel de planner- als de publieke lijst.
export function groepeerPerMoment<T extends { moment: MuziekMoment }>(
  tracks: T[]
): Map<MuziekMoment, T[]> {
  const map = new Map<MuziekMoment, T[]>()
  for (const def of MUZIEK_MOMENTEN) map.set(def.value, [])
  for (const track of tracks) {
    const lijst = map.get(track.moment)
    if (lijst) lijst.push(track)
    else map.set(track.moment, [track])
  }
  return map
}

// Platte tekstversie van de lijst — voor "kopieer alles" richting de DJ
// (veel DJ's plakken dit direct in hun eigen voorbereiding).
type TekstTrack = Pick<
  PublicMuziekTrack,
  'titel' | 'artiest' | 'moment' | 'opmerking' | 'bron' | 'gastNaam'
>

export function muziekAlsTekst(tracks: TekstTrack[]): string {
  const groepen = groepeerPerMoment(tracks)
  const delen: string[] = []
  for (const def of MUZIEK_MOMENTEN) {
    const lijst = groepen.get(def.value) ?? []
    if (lijst.length === 0) continue
    const regels = lijst.map((t) => {
      const extra = [
        t.opmerking,
        t.bron === 'gast' && t.gastNaam ? `verzoek van ${t.gastNaam}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
      return `- ${trackRegel(t)}${extra ? ` (${extra})` : ''}`
    })
    delen.push(`${def.label.toUpperCase()}\n${regels.join('\n')}`)
  }
  return delen.join('\n\n')
}
