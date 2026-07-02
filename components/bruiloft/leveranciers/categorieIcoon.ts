import {
  Cake,
  Camera,
  CarFront,
  Flower2,
  Gift,
  Laugh,
  Mail,
  MapPin,
  Mic2,
  Music,
  PartyPopper,
  Shirt,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
  Video,
  type LucideIcon,
} from 'lucide-react'

// Eén herkenbaar icoon per leverancierscategorie (kaarten, detail, voortgang).
export const CATEGORIE_ICOON: Record<string, LucideIcon> = {
  // Oud systeem (public.suppliers)
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

  // Nieuw systeem (public.businesses) — 20 categorieën
  Trouwlocaties: MapPin,
  Weddingplanners: Star,
  Trouwambtenaren: Mic2,
  Trouwjurken: Shirt,
  Trouwpakken: Shirt,
  Bruidsmakeup: Sparkles,
  Bruidskapsels: Sparkles,
  Trouwringen: Star,
  Trouwfotografen: Camera,
  Videografen: Video,
  Photobooths: Laugh,
  Bruidstaart: Cake,
  Catering: UtensilsCrossed,
  Decoratie: PartyPopper,
  Bloemen: Flower2,
  Muziek: Music,
  Trouwvervoer: CarFront,
  Entertainment: PartyPopper,
  Trouwkaarten: Mail,
  Bedankjes: Gift,
}

export function getCategorieIcoon(type: string): LucideIcon {
  return CATEGORIE_ICOON[type] ?? Store
}
