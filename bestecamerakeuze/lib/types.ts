export type Product = {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
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
};
