/**
 * Vorm van één rij uit camerakeuze.products. De velden staan plat (niet genest) omdat
 * lib/products.ts het Supabase-resultaat rechtstreeks als Product[] doorgeeft: de
 * kolomnamen hier zijn dus letterlijk de kolomnamen in de database en in de CSV.
 */

/**
 * 'gimbal' hoort er als vierde waarde bij: een mechanische gimbal is fundamenteel iets
 * anders dan digitale of sensor-shift-stabilisatie en is de enige die looppassen echt
 * wegneemt. Zie supabase/migrations/0022_camerakeuze_vlog_specs.sql.
 */
export type Stabilisation = "geen" | "digitaal" | "optisch" | "gimbal";

export const STABILISATION_LABELS: Record<Stabilisation, string> = {
  geen: "Geen",
  digitaal: "Digitaal",
  optisch: "Optisch in body",
  gimbal: "Mechanische gimbal",
};

export type Product = {
  id: string;
  title: string;
  brand: string;
  category: string;
  /** null = nog geen prijs uit de winkelfeed. Nooit invullen met een schatting. */
  price: number | null;
  old_price: number | null;
  rating: number | null;
  review_count: number;
  image_url: string | null;
  affiliate_url: string;
  description: string | null;
  /** Kernspecs als losse label/waarde-paren, zodat de specs-tabel merk-onafhankelijk blijft. */
  specs: Record<string, string>;
  pros: string[];
  cons: string[];

  // Vlog-specificaties. null betekent overal "niet geverifieerd", niet "nee" — de UI
  // toont dat als "—". Zie migratie 0022 voor de reden.
  flip_screen: boolean | null;
  screen_type: string | null;
  stabilisation: Stabilisation | null;
  mic_input: boolean | null;
  headphone_out: boolean | null;
  max_clip_minutes: number | null;
  unlimited_recording: boolean | null;
  overheating_reported: boolean | null;
  weight_g: number | null;
  autofocus_type: string | null;
  log_profiles: string[];
  battery_video_minutes: number | null;
};
