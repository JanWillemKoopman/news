import type { Config } from "tailwindcss";

// Starbucks.nl-palet (modern & koel): bijna-witte / lichtgrijze canvassen, platte vlakken
// zónder schaduw, koel bijna-zwart voor tekst (meer grijs dan bruin), en het House Green
// als merk-/actiekleur met diep bosgroen voor donkere vlakken. Semantische tokens
// (bg / surface / border / fg / accent …) zodat de hele app centraal bij te stellen is.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Koel, bijna-wit lichtgrijs canvas (niet crème).
        bg: "#F4F5F4",
        surface: {
          DEFAULT: "#FFFFFF", // witte kaart die plat op het lichtgrijze canvas ligt
          2: "#F0F1F0", // subtiel koel grijs voor genestelde vlakken / invoervelden
          3: "#E6E8E7", // iets dieper grijs voor actieve/ingedrukte vlakken
        },
        border: {
          // Neutrale, koele hairline-randen (geen warme tint).
          DEFAULT: "rgba(0,0,0,0.10)",
          strong: "rgba(0,0,0,0.20)",
        },
        fg: {
          DEFAULT: "#182420", // koel bijna-zwart met een vleugje bosgroen — neutraal, niet bruin
          muted: "#5C6660",
          faint: "#8C938F",
        },
        // Het Starbucks House Green als enige primaire actie-/merkkleur.
        accent: {
          DEFAULT: "#00693E",
          hover: "#00522F",
          dim: "rgba(0,105,62,0.08)",
        },
        // Merkgroen-schaal voor de marketing/landingsvlakken. Ondersteunt opacity-modifiers
        // (brand-500/10) net als losse kleuren. 700 = het diepe bosgroen van donkere vlakken.
        brand: {
          50: "#E8F1EC",
          100: "#C9E3D5",
          200: "#9BCDB4",
          300: "#5FAE8B",
          400: "#1F8B5C",
          500: "#00693E",
          600: "#00522F",
          700: "#1E3932",
        },
        // Warme goud-accent — uitsluitend voor het logo, niet voor de UI.
        gold: {
          DEFAULT: "#B8863B",
          soft: "#CBA258",
          dim: "rgba(203,162,88,0.16)",
        },
        success: {
          DEFAULT: "#1E7A4B",
          dim: "rgba(30,122,75,0.12)",
        },
        danger: {
          DEFAULT: "#C0362C",
          dim: "rgba(192,54,44,0.09)",
        },
        warn: {
          DEFAULT: "#9A6B12",
          dim: "rgba(154,107,18,0.12)",
        },
      },
      fontFamily: {
        // Strakke, moderne humanistische sans (Figtree via next/font, zie layout.tsx) —
        // in de geest van Starbucks' SoDo Sans, voor zowel koppen als broodtekst.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        // Modern-matige afrondingen: pillen voor knoppen, nette ronding voor kaarten —
        // niet overdreven organisch.
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        // Starbucks.nl is volledig plat: geen decoratieve schaduwen. De standaard-
        // schaduwklassen zijn daarom uitgezet; vlakken worden onderscheiden door hun
        // tint en een hairline-rand. glow/glow-sm blijven — uitsluitend als focus-ring
        // voor toetsenbordnavigatie (toegankelijkheid).
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
        panel: "none",
        soft: "none",
        glow: "0 0 0 3px rgba(0,105,62,0.35)",
        "glow-sm": "0 0 0 3px rgba(0,105,62,0.30)",
      },
    },
  },
  plugins: [],
};

export default config;
