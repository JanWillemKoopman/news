/**
 * Herkomst en licentie van de productfoto's in public/products/.
 *
 * De foto's komen van Wikimedia Commons en niet uit een winkelfeed. Dat is een bewuste
 * keuze: een affiliate-programma licenseert zijn eigen productbeelden pas zodra je
 * partner bent, en persfoto's van fabrikanten mogen we niet zomaar meeleveren in een
 * publieke repository. Commons-materiaal mag dat wél — mits we de maker noemen, de
 * licentie noemen en vermelden of we het bewerkt hebben. Precies dat staat hier, en
 * `components/PhotoCredits.tsx` zet het op de pagina.
 *
 * CC BY en CC BY-SA verplichten die naamsvermelding. CC0-foto's hoeven het niet, maar
 * staan er om dezelfde reden bij: één lijst is makkelijker kloppend te houden dan twee.
 *
 * Bij `modified: true` hebben wij bijgesneden om het toestel vrij te maken van een
 * rommelige achtergrond. Voor de CC BY-SA-foto's betekent dat dat onze bijgesneden
 * versie onder dezelfde licentie valt; dat staat ook in de tekst onder de lijst.
 *
 * Zodra de winkelfeed draait vervangen de gelicentieerde productbeelden hiervan het
 * merendeel. Tot die tijd is dit de eerlijke oplossing.
 */
export type PhotoCredit = {
  /** Bestandsnaam op Wikimedia Commons. */
  file: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  /** Hebben wij het beeld bijgesneden of anderszins bewerkt. */
  modified: boolean;
};

export const PHOTO_CREDITS: Record<string, PhotoCredit> = {
  "CAM-001": {
    file: "Sony.alpha.7IV.G-Master.24-105mm.DSC00141.jpg",
    author: "Bautsch",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.nl",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Sony.alpha.7IV.G-Master.24-105mm.DSC00141.jpg",
    modified: false,
  },
  "CAM-002": {
    file: "Fujifilm X-T5 with Fujinon XF 35mm F2 R WR - by Henry Söderlund (52536299126).jpg",
    author: "Henry Söderlund",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/deed.nl",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Fujifilm_X-T5_with_Fujinon_XF_35mm_F2_R_WR_-_by_Henry_S%C3%B6derlund_(52536299126).jpg",
    modified: false,
  },
  "CAM-003": {
    file: "Canon EOS R6 Mark II - by Henry Söderlund (52546794891).jpg",
    author: "Henry Söderlund",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/deed.nl",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Canon_EOS_R6_Mark_II_-_by_Henry_S%C3%B6derlund_(52546794891).jpg",
    modified: false,
  },
  "CAM-004": {
    file: "Nikon Z6III (by Henry Söderlund).jpg",
    author: "Henry Söderlund",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Nikon_Z6III_(by_Henry_S%C3%B6derlund).jpg",
    modified: false,
  },
  "CAM-006": {
    file: "Panasonic LUMIX S5 II (52682131682).jpg",
    author: "Henry Söderlund",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Panasonic_LUMIX_S5_II_(52682131682).jpg",
    modified: false,
  },
  "CAM-007": {
    file: "Fujifilm X100VI 25 may 2024a.jpg",
    author: "昼落ち",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Fujifilm_X100VI_25_may_2024a.jpg",
    modified: true,
  },
  "CAM-008": {
    file: "Canon EOS R8 (52853735946).jpg",
    author: "Henry Söderlund",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Canon_EOS_R8_(52853735946).jpg",
    modified: false,
  },
  "CAM-009": {
    file: "Sony Alpha 6700 (DSC 7823).jpg",
    author: "Tsungam",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Sony_Alpha_6700_(DSC_7823).jpg",
    modified: false,
  },
  "CAM-010": {
    file: "Nikon Z f 8 nov 2023a.jpg",
    author: "昼落ち",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Nikon_Z_f_8_nov_2023a.jpg",
    modified: true,
  },
  "CAM-011": {
    file: "DJI Osmo Pocket 3 - 4.jpg",
    author: "Kyu3a",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:DJI_Osmo_Pocket_3_-_4.jpg",
    modified: true,
  },
  "CAM-012": {
    file: "Sony ZV-1 II by Henry Söderlund.jpg",
    author: "Henry Söderlund",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Sony_ZV-1_II_by_Henry_S%C3%B6derlund.jpg",
    modified: false,
  },
  "CAM-013": {
    file: "Sony ZV-E1 with Sony FE 28-60mm F4-5.6 - by Henry Söderlund (52854053098).jpg",
    author: "Henry Söderlund",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/deed.nl",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Sony_ZV-E1_with_Sony_FE_28-60mm_F4-5.6_-_by_Henry_S%C3%B6derlund_(52854053098).jpg",
    modified: false,
  },
  "CAM-014": {
    file: "Canon EOS R50 (52694437103).jpg",
    author: "Henry Söderlund",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Canon_EOS_R50_(52694437103).jpg",
    modified: false,
  },
  "CAM-015": {
    file: "Fujifilm X-S20 by Henry Söderlund.jpg",
    author: "Henry Söderlund",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Fujifilm_X-S20_by_Henry_S%C3%B6derlund.jpg",
    modified: false,
  },
  "CAM-016": {
    file: "Nikon Z30 oblique.jpg",
    author: "Phiarc",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Nikon_Z30_oblique.jpg",
    modified: false,
  },
  "CAM-017": {
    file: "Canon PowerShot V10 - 4.jpg",
    author: "Kyu3",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Canon_PowerShot_V10_-_4.jpg",
    modified: true,
  },
  "CAM-018": {
    file: "GoPro Héro 13 Black - 03.jpg",
    author: "François de Dijon",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.nl",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:GoPro_H%C3%A9ro_13_Black_-_03.jpg",
    modified: false,
  },
};

/**
 * Modellen waarvoor geen vrij gelicentieerde foto bestaat. Die krijgen een expliciete
 * "foto volgt"-tegel in plaats van een foto van een ander model — een lookalike zou de
 * bezoeker laten denken dat hij ziet wat hij koopt.
 */
export const PHOTO_MISSING: Record<string, string> = {
  "CAM-005":
    "Van de Sony ZV-E10 II staat geen vrij gelicentieerde foto op Wikimedia Commons; " +
    "de afbeeldingen daar tonen het eerste model (ZV-E10). Tot de winkelfeed gekoppeld " +
    "is tonen we daarom een tegel in plaats van een foto.",
};

export function getPhotoCredit(id: string): PhotoCredit | null {
  return PHOTO_CREDITS[id] ?? null;
}
