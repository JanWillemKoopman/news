// Vaste suggestielijst voor moodboard-categorieën — vrije tekst in de
// database (zie types.ts), net als BudgetCategorie/VendorType. Deze lijst
// drijft alleen de filterchips en de "kies uit de lijst"-select bij het
// toevoegen; een eigen categorie intypen kan altijd (zelfde patroon als
// VendorForm's "Nieuwe categorie…").
export const MOODBOARD_CATEGORIEEN = [
  'kleuren & thema',
  'jurk & pak',
  'bloemen',
  'decoratie',
  'locatie',
  'haar & make-up',
  'taart & gebak',
  'uitnodigingen',
  'overig',
] as const

export type MoodboardStandaardCategorie = (typeof MOODBOARD_CATEGORIEEN)[number]
