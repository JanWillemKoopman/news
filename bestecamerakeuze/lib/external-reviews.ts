/**
 * Wat andere reviewsites over een camera zeggen, per camera gebundeld.
 *
 * Dit is de kern van de vlogpagina: geen enkele reviewer test alles, en waar twee
 * gerenommeerde sites elkaar tegenspreken is dat zelf het meest bruikbare signaal. Daarom
 * staat hier per bron het oordeel én de bron-URL, zodat de bezoeker het kan nalezen.
 *
 * Spelregels voor dit bestand:
 *
 * 1. Een regel komt hier alleen in als het oordeel daadwerkelijk op de genoemde pagina
 *    gelezen is. `score` blijft `null` als de site geen cijfer publiceert — een cijfer
 *    verzinnen bij een positief oordeel is precies de fout die deze pagina moet vermijden.
 * 2. `verdict` is een Nederlandse weergave van de conclusie van die reviewer, niet ons
 *    eigen oordeel. Ons oordeel staat in lib/vlog.ts en lib/reviews.ts.
 * 3. `checkedOn` is de dag waarop de pagina is gelezen. Reviewers werken hun stukken bij;
 *    zonder datum weet niemand hoe oud het cijfer is.
 *
 * Dit bestand staat bewust los van de productfeed (lib/products.ts): de feed verandert
 * dagelijks mee met prijs en voorraad, een reviewconclusie verandert alleen als de
 * reviewer hem herschrijft.
 */

export type ExternalReview = {
  source: string;
  url: string;
  /** Cijfer zoals de bron het publiceert. null = die bron geeft geen cijfer. */
  score: number | null;
  /** Waarvan het cijfer er een is (5 bij "4 van de 5"). null als score null is. */
  scale: number | null;
  /** Predikaat zonder cijfer, zoals "Highly Recommended" of "Editors' Choice". */
  award: string | null;
  /** Kern van de conclusie van die reviewer, in het Nederlands weergegeven. */
  verdict: string;
  /** Concrete meting uit die review — opnameduur, accuduur, temperatuur. */
  measured?: string;
  /** ISO-datum waarop wij de pagina gelezen hebben. */
  checkedOn: string;
};

const CHECKED = "2026-08-08";

export const EXTERNAL_REVIEWS: Record<string, ExternalReview[]> = {
  "CAM-005": [
    {
      source: "Digital Camera World",
      url: "https://www.digitalcameraworld.com/reviews/sony-zv-e10-ii-review",
      score: null,
      scale: null,
      award: null,
      verdict:
        "Komt volgens deze reviewer zo dicht bij een perfecte vlogcamera als op dit moment mogelijk is.",
      checkedOn: CHECKED,
    },
    {
      source: "PetaPixel",
      url: "https://petapixel.com/2024/07/10/sony-zv-e10-ii-review-finally-a-great-affordable-creators-camera/",
      score: null,
      scale: null,
      award: null,
      verdict:
        "Uitzonderlijk veel camera voor het geld voor wie video maakt, maar het ontbreken van een mechanische sluiter levert rolling shutter en banding op.",
      measured:
        "Elektronische stabilisatie werkt goed bij korte sluitertijden, maar geeft op 24p met 1/48 onregelmatig onscherpe frames.",
      checkedOn: CHECKED,
    },
  ],

  "CAM-009": [
    {
      source: "Trusted Reviews",
      url: "https://www.trustedreviews.com/reviews/sony-a6700",
      score: 4.5,
      scale: 5,
      award: null,
      verdict:
        "Sterke hybride camera met eersteklas autofocus, veel video-opties en een goede sensor.",
      measured:
        "Geen actieve koeling: reken op circa 30 minuten voor de camera bij zwaardere 4K-modi afslaat.",
      checkedOn: CHECKED,
    },
  ],

  "CAM-011": [
    {
      source: "Trusted Reviews",
      url: "https://www.trustedreviews.com/reviews/dji-osmo-pocket-3",
      score: 4.5,
      scale: 5,
      award: null,
      verdict:
        "Mogelijk de beste vlogcamera die er is als je veel staand (9:16) filmt terwijl je onderweg bent.",
      measured: "Circa 116 minuten 4K/60p op één lading; opladen gaat 3x sneller dan bij de Pocket 2.",
      checkedOn: CHECKED,
    },
    {
      source: "Digital Camera World",
      url: "https://www.digitalcameraworld.com/reviews/dji-osmo-pocket-3-review",
      score: null,
      scale: null,
      award: null,
      verdict:
        "Laat zich moeilijk in een hokje plaatsen, maar werkt zowel voor vloggers als voor toeristen en kan met de Mic 2 als kleine studio dienst doen.",
      checkedOn: CHECKED,
    },
  ],

  "CAM-012": [
    {
      source: "Trusted Reviews",
      url: "https://www.trustedreviews.com/reviews/sony-zv-1-ii",
      score: 4,
      scale: 5,
      award: null,
      verdict:
        "Het schrappen van de optische stabilisatie is onbegrijpelijk, maar wie niet al lopend filmt krijgt de beste autofocus in dit formaat, een goede microfoon en een compacte body.",
      measured:
        "Alleen elektronische stabilisatie: zichtbare crop en te weinig correctie voor lopend filmen.",
      checkedOn: CHECKED,
    },
  ],

  "CAM-013": [
    {
      source: "Trusted Reviews",
      url: "https://www.trustedreviews.com/reviews/sony-zv-e1",
      score: 5,
      scale: 5,
      award: null,
      verdict:
        "Op papier voor vloggers bedoeld, maar het formaat en de beeldkwaliteit maken hem interessant voor iedereen die serieus video maakt.",
      measured: "Circa 25 minuten 4K/60p voordat de camera zichzelf uitschakelde om af te koelen.",
      checkedOn: CHECKED,
    },
    {
      source: "Cameralabs",
      url: "https://www.cameralabs.com/sony-zv-e1-review/",
      score: null,
      scale: null,
      award: "Highly Recommended",
      verdict:
        "Sony's krachtigste consumentencamera voor videomakers: kwaliteit en framerates van de A7S III in een kleinere body, met betere stabilisatie en een betere ingebouwde microfoon.",
      measured:
        "52 minuten en 25 seconden 4K 50p XAVC HS voordat het toestel te warm werd en afsloeg, met nog circa tweederde accu over.",
      checkedOn: CHECKED,
    },
  ],

  "CAM-014": [
    {
      source: "Cameralabs",
      url: "https://www.cameralabs.com/canon-eos-r50-review/",
      score: null,
      scale: null,
      award: "Highly Recommended",
      verdict:
        "Een aanrader voor wie een compacte, betaalbare camera wil met de flexibiliteit van verwisselbare lenzen.",
      measured:
        "1 uur en 13 minuten 4K 25p op één accu, verdeeld over twee bestanden door de limiet van 60 minuten per clip. Geen oververhitting waargenomen.",
      checkedOn: CHECKED,
    },
    {
      source: "Trusted Reviews",
      url: "https://www.trustedreviews.com/reviews/canon-eos-r50",
      score: null,
      scale: null,
      award: null,
      verdict:
        "Maakt scherpe foto's en heldere video met bijzonder weinig moeite, maar zonder stabilisatie in de body wordt beeld uit de hand schokkerig.",
      checkedOn: CHECKED,
    },
  ],

  "CAM-015": [
    {
      source: "Trusted Reviews",
      url: "https://www.trustedreviews.com/reviews/fujifilm-x-s20",
      score: 4,
      scale: 5,
      award: null,
      verdict:
        "Lichte camera die moeiteloos wisselt tussen scherpe foto's en vloggen in 6,2K.",
      measured:
        "20 minuten 4K/60p voordat het toestel op temperatuur afsloeg; met de temperatuurlimiet omhoog nog eens 20 minuten.",
      checkedOn: CHECKED,
    },
    {
      source: "Cameralabs",
      url: "https://www.cameralabs.com/fujifilm-xs20-review/",
      score: null,
      scale: null,
      award: "Highly Recommended",
      verdict:
        "Een sterk voorstel: een al goede fotocamera met video-mogelijkheden die in deze prijsklasse tot de beste behoren.",
      measured:
        "Circa 75 minuten 4K 30p of circa 30 minuten 6,2K 30p; de optionele koelventilator verlengt dat vooral bij warm weer.",
      checkedOn: CHECKED,
    },
  ],

  "CAM-016": [
    {
      source: "Trusted Reviews",
      url: "https://www.trustedreviews.com/reviews/nikon-z30",
      score: 4,
      scale: 5,
      award: null,
      verdict:
        "Een prettige kleine vlogcamera voor dagelijkse 4K-video, met als voornaamste gemis stabilisatie in de body en een koptelefoonaansluiting.",
      checkedOn: CHECKED,
    },
  ],

  "CAM-017": [
    {
      source: "Cameralabs",
      url: "https://www.cameralabs.com/canon-powershot-v10-review/",
      score: null,
      scale: null,
      award: "Highly Recommended",
      verdict:
        "Een toestel dat allereerst voor videomakers is ontworpen, in plaats van dat je om de ergonomie van een fotocamera heen moet werken.",
      measured:
        "Ruim 30 minuten 4K in één clip en circa een uur filmen in totaal op één accu.",
      checkedOn: CHECKED,
    },
    {
      source: "Trusted Reviews",
      url: "https://www.trustedreviews.com/reviews/canon-powershot-v10",
      score: null,
      scale: null,
      award: null,
      verdict:
        "Ondanks sterke punten mist Canons eerste vlogcamera volgens deze reviewer de kwaliteit om een telefoon te vervangen of het tegen een systeemcamera op te nemen.",
      checkedOn: CHECKED,
    },
  ],

  "CAM-018": [
    {
      source: "Cycling Weekly",
      url: "https://www.cyclingweekly.com/reviews/action-cameras/gopro-hero-13-black-review-brilliant-video-performance-with-boosted-hdr-and-great-additional-lenses",
      score: null,
      scale: null,
      award: null,
      verdict:
        "Bijgewerkte software, betere accuduur en de nieuwe lensmodules maken dit een bescheiden maar reële stap vooruit ten opzichte van de HERO12.",
      measured: "Accuduur is merkbaar beter bij zowel warm als koud weer.",
      checkedOn: CHECKED,
    },
  ],
};

export function getExternalReviews(id: string): ExternalReview[] {
  return EXTERNAL_REVIEWS[id] ?? [];
}

export type ReviewConsensus = {
  /** Gemiddelde van de bronnen die wél een cijfer publiceren, genormaliseerd naar 10. */
  average10: number | null;
  /** Aantal bronnen met een cijfer, en het totaal aantal bronnen. */
  scored: number;
  total: number;
};

/**
 * Middelt alleen bronnen die een cijfer publiceren, en normaliseert naar een schaal van
 * 10 zodat "4 van 5" en "8,5 van 10" optelbaar worden. Bronnen zonder cijfer tellen mee
 * in `total` maar niet in het gemiddelde — de UI laat dat verschil zien, zodat een
 * gemiddelde uit één bron niet als consensus overkomt.
 */
export function reviewConsensus(id: string): ReviewConsensus {
  const reviews = getExternalReviews(id);
  const scored = reviews.filter(
    (review): review is ExternalReview & { score: number; scale: number } =>
      review.score !== null && review.scale !== null && review.scale > 0,
  );

  if (scored.length === 0) {
    return { average10: null, scored: 0, total: reviews.length };
  }

  const sum = scored.reduce((total, review) => total + (review.score / review.scale) * 10, 0);
  return {
    average10: Math.round((sum / scored.length) * 10) / 10,
    scored: scored.length,
    total: reviews.length,
  };
}

export const EXTERNAL_REVIEW_DISCLOSURE =
  "Deze cijfers en oordelen komen van de genoemde reviewsites, niet van ons. We nemen " +
  "alleen over wat daadwerkelijk op hun reviewpagina staat en linken erheen zodat je het " +
  "kunt nalezen. Publiceert een site geen cijfer, dan tonen we alleen het oordeel — we " +
  "rekenen er geen cijfer bij. Reviewers werken hun stukken bij; bij elke bron staat de " +
  "datum waarop wij hem gelezen hebben.";
