/**
 * Knipt een volledige-pagina-screenshot in de browser in stukken die Claude goed kan
 * lezen. Eén lange afbeelding (een campagnepagina is al snel 10.000 pixels hoog) zou
 * de API verkleinen tot tekst en knoppen onleesbaar zijn; stukken van 1000 × 1400
 * blijven scherp. De stukken gaan in volgorde van boven naar beneden mee, zodat het
 * eerste stuk het eerste scherm van de pagina is.
 *
 * Alleen voor de client (canvas); de server krijgt kant-en-klare JPEG's in base64.
 */

const BREEDTE = 1000;
const HOOGTE_PER_STUK = 1400;
/** Genoeg voor een pagina van zo'n 14× de schermhoogte; de rest valt weg (en dat zeggen we). */
export const MAX_STUKKEN = 10;

export interface GedeeldeScreenshot {
  /** JPEG's in base64 (zonder "data:"-prefix), van boven naar beneden. */
  stukken: string[];
  /** Kleine voorvertoning (data-URL) om te tonen dat de upload gelukt is. */
  voorbeeld: string;
  breedte: number;
  hoogte: number;
  afgekapt: boolean;
}

function laadAfbeelding(bestand: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(bestand);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Deze afbeelding kon niet worden gelezen."));
    img.src = url;
  });
}

export async function deelScreenshot(bestand: File): Promise<GedeeldeScreenshot> {
  const img = await laadAfbeelding(bestand);
  const schaal = Math.min(1, BREEDTE / img.naturalWidth);
  const breedte = Math.round(img.naturalWidth * schaal);
  const hoogte = Math.round(img.naturalHeight * schaal);

  const aantal = Math.ceil(hoogte / HOOGTE_PER_STUK);
  const stukken: string[] = [];
  for (let i = 0; i < Math.min(aantal, MAX_STUKKEN); i++) {
    const y = i * HOOGTE_PER_STUK;
    const h = Math.min(HOOGTE_PER_STUK, hoogte - y);
    const canvas = document.createElement("canvas");
    canvas.width = breedte;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Je browser kan de afbeelding niet verwerken.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, breedte, h);
    ctx.drawImage(img, 0, y / schaal, img.naturalWidth, h / schaal, 0, 0, breedte, h);
    stukken.push(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
  }

  // Voorvertoning: de hele pagina smal, zodat je in één oogopslag ziet welke het is.
  const vbBreedte = 240;
  const vbHoogte = Math.round(img.naturalHeight * (vbBreedte / img.naturalWidth));
  const vb = document.createElement("canvas");
  vb.width = vbBreedte;
  vb.height = Math.min(vbHoogte, 4000);
  vb.getContext("2d")?.drawImage(img, 0, 0, vbBreedte, vbHoogte);
  URL.revokeObjectURL(img.src);

  return {
    stukken,
    voorbeeld: vb.toDataURL("image/jpeg", 0.7),
    breedte: img.naturalWidth,
    hoogte: img.naturalHeight,
    afgekapt: aantal > MAX_STUKKEN,
  };
}
