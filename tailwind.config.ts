import type { Config } from "tailwindcss";

// Licht, Apple-geïnspireerd palet (apple.com-achtig: wit/lichtgrijs canvas, kalm blauw
// als enige actiekleur). Semantische tokens (bg / surface / border / fg / accent …)
// i.p.v. losse kleurnamen, zodat de hele app centraal bij te stellen is en componenten
// hun bedoeling uitdrukken. Betekenis strikt gescheiden: blauw = actie/merk/AI-voorstel,
// groen = geslaagd/gezond, rood = attentie/mislukt, amber = waarschuwing.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F5F7",
        surface: {
          DEFAULT: "#FFFFFF",
          2: "#F5F5F7",
          3: "#E8E8ED",
        },
        border: {
          DEFAULT: "rgba(0,0,0,0.08)",
          strong: "rgba(0,0,0,0.16)",
        },
        fg: {
          DEFAULT: "#1D1D1F",
          muted: "#6E6E73",
          faint: "#98989D",
        },
        accent: {
          DEFAULT: "#0071E3",
          hover: "#0077ED",
          dim: "rgba(0,113,227,0.08)",
        },
        success: {
          DEFAULT: "#1F8A3B",
          dim: "rgba(52,199,89,0.12)",
        },
        danger: {
          DEFAULT: "#D70015",
          dim: "rgba(255,59,48,0.08)",
        },
        warn: {
          DEFAULT: "#B25E00",
          dim: "rgba(255,159,10,0.12)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        // Voorheen neon-glows; nu zachte focus-ringen en kaart-schaduwen passend bij het
        // lichte thema. Klassen heten nog glow/glow-sm zodat bestaande componenten werken.
        glow: "0 0 0 4px rgba(0,113,227,0.20)",
        "glow-sm": "0 0 0 3px rgba(0,113,227,0.15)",
        panel: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
