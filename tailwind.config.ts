import type { Config } from "tailwindcss";

// Starbucks-geïnspireerd palet: warme crème/havermelk-canvassen, het iconische diepe
// "House Green" als merk-/actiekleur, en diepe boskoffie-groen i.p.v. hard zwart voor
// tekst. Semantische tokens (bg / surface / border / fg / accent …) i.p.v. losse
// kleurnamen, zodat de hele app centraal bij te stellen is en componenten hun bedoeling
// uitdrukken. Betekenis strikt gescheiden: groen = actie/merk, brand = redactionele
// merkaccenten, goud = warme highlight, roodbruin = attentie/mislukt, amber = waarschuwing.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warme, romige havermelk-canvas — geen harde witte of grijze achtergrond.
        bg: "#F7F3EA",
        surface: {
          DEFAULT: "#FDFBF6", // zachte crème-witte kaart die rustig oplicht op het canvas
          2: "#F2ECDE", // dieper oat/crème voor subtiele vlakken
          3: "#E7DECB", // warm taupe voor actieve/ingedrukte vlakken
        },
        border: {
          // Bos-getinte, warme randen i.p.v. neutraal grijs.
          DEFAULT: "rgba(30,57,50,0.12)",
          strong: "rgba(30,57,50,0.22)",
        },
        fg: {
          DEFAULT: "#1E3932", // diep boskoffie-groen als "inkt" — warmer dan zwart
          muted: "#4C5F57",
          faint: "#8A9891",
        },
        // Het iconische Starbucks House Green als enige primaire actie-/merkkleur.
        accent: {
          DEFAULT: "#00754A",
          hover: "#00623E",
          dim: "rgba(0,117,74,0.10)",
        },
        // Redactionele merkgroen-schaal voor de marketing/landingsvlakken (verving het
        // oude roze). Ondersteunt opacity-modifiers (brand-500/10) net als losse kleuren.
        brand: {
          50: "#EAF3EE",
          100: "#CDE5D9",
          200: "#A7D2BF",
          300: "#6FB394",
          400: "#2E9068",
          500: "#00754A",
          600: "#00623E",
          700: "#1E3932",
        },
        // Warme goud/koffie-highlight — spaarzaam voor accenten en waarschuwingen.
        gold: {
          DEFAULT: "#B8863B",
          soft: "#CBA258",
          dim: "rgba(203,162,88,0.16)",
        },
        success: {
          DEFAULT: "#1E7A4B",
          dim: "rgba(30,122,75,0.14)",
        },
        danger: {
          DEFAULT: "#B23A2E", // warm baksteenrood i.p.v. schel rood
          dim: "rgba(178,58,46,0.10)",
        },
        warn: {
          DEFAULT: "#9C6B1E",
          dim: "rgba(203,162,88,0.18)",
        },
      },
      fontFamily: {
        // Warme, redactionele typografie via next/font (zie app/layout.tsx): Mulish als
        // uiterst leesbare humanistische broodtekst, Fraunces als ambachtelijke
        // display-serif voor sterke koppen.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        // Zachtere, organische afrondingen over de hele lijn — de standaardschaal is
        // ruimer gezet zodat bestaande rounded-lg/xl/2xl klassen vanzelf vriendelijker
        // worden, zonder elke component aan te raken.
        sm: "0.375rem",
        DEFAULT: "0.625rem",
        md: "0.75rem",
        lg: "0.875rem",
        xl: "1.125rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        // Zacht vallende, warme (bosgroen-getinte) schaduwen i.p.v. harde zwarte —
        // tastbaar en hoogwaardig. Focus-ringen in het House Green.
        glow: "0 0 0 4px rgba(0,117,74,0.18)",
        "glow-sm": "0 0 0 3px rgba(0,117,74,0.16)",
        panel: "0 1px 2px rgba(30,57,50,0.04), 0 14px 34px -16px rgba(30,57,50,0.18)",
        soft: "0 2px 10px rgba(30,57,50,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
