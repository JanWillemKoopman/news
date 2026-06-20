// Directe, regelgebaseerde tip bij een wijziging (#5). Géén AI: meteen,
// gratis en zonder wachttijd. Gebruikt eenvoudige benchmark-vuistregels zodat
// het koppel op het beslismoment (bijv. budget of gasten aanpassen) een
// zinvolle reactie krijgt. Pure functie — makkelijk te testen en hergebruiken.

import type { Wedding } from './types'

export interface DirecteTip {
  titel: string
  tekst: string
}

// Vuistregel uit de trouwbenchmarks: een complete bruiloft kost grofweg
// €150–€200 per gast. Hieronder wordt het krap, ruim erboven is er veel mogelijk.
const PER_GAST_KRAP = 125
const PER_GAST_RUIM = 250

export function directeWijzigingsTip(wedding: Wedding): DirecteTip | null {
  const gasten = Math.max(wedding.aantalDaggasten, wedding.aantalAvondgasten)
  const budget = wedding.totaalBudget

  if (gasten > 0 && budget > 0) {
    const perGast = Math.round(budget / gasten)
    if (perGast < PER_GAST_KRAP) {
      return {
        titel: 'Budget is aan de krappe kant',
        tekst: `Met ongeveer €${perGast} per gast zit je onder wat een bruiloft gemiddeld kost (€150–€200 p.p.). Kies bewust waar jullie op willen uitpakken en waar het soberder mag.`,
      }
    }
    if (perGast > PER_GAST_RUIM) {
      return {
        titel: 'Ruim budget per gast',
        tekst: `Met ongeveer €${perGast} per gast zit je royaal boven het gemiddelde. Mooie ruimte om uit te pakken op de dingen die jullie het belangrijkst vinden.`,
      }
    }
    return {
      titel: 'Budget en gasten in balans',
      tekst: `Ongeveer €${perGast} per gast — dat sluit goed aan bij wat een bruiloft gemiddeld kost. Een gezonde basis om mee te plannen.`,
    }
  }

  return null
}
