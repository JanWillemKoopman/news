// Geo-rekenwerk voor de leveranciersdirectory: afstand tussen twee
// coördinaten en de bounding box waarmee we een straal-zoekopdracht eerst
// grof voorselecteren in de database (lat/lon tussen min/max) voordat de
// exacte cirkel-afstand per rij wordt berekend. Puur en framework-vrij.

export interface Coordinaat {
  lat: number
  lon: number
}

// Straal-opties (km) voor "zoek in de buurt". 15 km is de standaard: ruim
// genoeg om vanuit een dorp (Diessen) de omliggende kernen (Haghorst, 4 km)
// én de dichtstbijzijnde stad te vangen, zonder half Nederland te tonen.
export const STRAAL_OPTIES = [5, 10, 15, 25, 50] as const
export const STANDAARD_STRAAL = 15

const AARDE_RADIUS_KM = 6371

// Haversine-afstand in kilometers tussen twee punten.
export function afstandKm(a: Coordinaat, b: Coordinaat): number {
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * AARDE_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export interface BoundingBox {
  latMin: number
  latMax: number
  lonMin: number
  lonMax: number
}

// Bounding box rond een middelpunt: 1 breedtegraad ≈ 111,32 km; de
// lengtegraad-delta corrigeert voor de breedtegraad (Nederland ≈ cos 52°).
export function boundingBox(middelpunt: Coordinaat, straalKm: number): BoundingBox {
  const latDelta = straalKm / 111.32
  const lonDelta = straalKm / (111.32 * Math.cos((middelpunt.lat * Math.PI) / 180))
  return {
    latMin: middelpunt.lat - latDelta,
    latMax: middelpunt.lat + latDelta,
    lonMin: middelpunt.lon - lonDelta,
    lonMax: middelpunt.lon + lonDelta,
  }
}

// "3,2 km" / "850 m" / "12 km" — afstanden boven de 10 km zonder decimaal.
export function formatteerAfstand(km: number): string {
  if (km < 1) return `${Math.round(km * 100) * 10} m`
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km)} km`
}
