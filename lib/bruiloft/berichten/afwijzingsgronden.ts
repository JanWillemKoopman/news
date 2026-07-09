import type { AfwijzingsGrond } from '@/lib/bruiloft/types'

// Standaard afwijzingsgronden voor leveranciers op de publieke reactiepagina
// (alleen bij offerteaanvragen). Gedeeld tussen de API-route (validatie +
// standaardzin) en de pagina (knoplabels + preview), zodat knop, zin en
// opgeslagen grond nooit uit elkaar lopen.
//
// - `knopLabel`: de snelkeuze-knop op de reactiepagina.
// - `zin`: de zin die als berichtinhoud bij het bruidspaar aankomt. Dit is de
//   volledige boodschap (zinnen boven badges) — een eventuele toelichting van
//   de leverancier komt er als extra alinea onder.
export interface AfwijzingsGrondDef {
  key: AfwijzingsGrond
  knopLabel: string
  zin: string
}

export const AFWIJZINGSGRONDEN: AfwijzingsGrondDef[] = [
  {
    key: 'geen_beschikbaarheid',
    knopLabel: 'Geen plek op de gewenste datum',
    zin: 'Helaas hebben wij op de gewenste datum geen plek meer. Veel succes met de voorbereidingen — hopelijk is er een volgende keer wél een match.',
  },
  {
    key: 'buiten_werkgebied',
    knopLabel: 'Locatie buiten ons werkgebied',
    zin: 'Helaas ligt de locatie van jullie bruiloft buiten ons werkgebied. Veel succes met het vinden van een partij dichterbij.',
  },
  {
    key: 'past_niet_bij_aanbod',
    knopLabel: 'Aanvraag past niet bij ons aanbod',
    zin: 'Helaas past deze aanvraag niet goed bij ons aanbod. Veel succes met de zoektocht — hopelijk vinden jullie snel een partij die wél past.',
  },
]

export const AFWIJZINGSGROND_KEYS = AFWIJZINGSGRONDEN.map((g) => g.key) as [
  AfwijzingsGrond,
  ...AfwijzingsGrond[],
]

export function afwijzingsGrondDef(key: AfwijzingsGrond): AfwijzingsGrondDef {
  // AFWIJZINGSGRONDEN dekt alle keys van het type; de fallback is er alleen
  // voor de typechecker.
  return AFWIJZINGSGRONDEN.find((g) => g.key === key) ?? AFWIJZINGSGRONDEN[0]
}
