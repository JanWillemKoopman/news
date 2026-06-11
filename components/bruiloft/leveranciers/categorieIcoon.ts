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

import type { VendorType } from '@/lib/bruiloft/types'

// Eén herkenbaar icoon per leverancierscategorie (kaarten, detail, voortgang).
export const CATEGORIE_ICOON: Record<VendorType, LucideIcon> = {
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
