import {
  Cake,
  Camera,
  CarFront,
  Flower2,
  MapPin,
  Music,
  Shirt,
  Store,
  UtensilsCrossed,
  Video,
  type LucideIcon,
} from 'lucide-react'

// Eén herkenbaar icoon per leverancierscategorie (kaarten, detail, voortgang).
export const CATEGORIE_ICOON: Record<string, LucideIcon> = {
  locatie: MapPin,
  catering: UtensilsCrossed,
  fotograaf: Camera,
  videograaf: Video,
  'dj of band': Music,
  bloemist: Flower2,
  kleding: Shirt,
  vervoer: CarFront,
  taart: Cake,
  overig: Store,
}

export function getCategorieIcoon(type: string): LucideIcon {
  return CATEGORIE_ICOON[type] ?? Store
}
