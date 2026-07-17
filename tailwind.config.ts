import type { Config } from "tailwindcss";

// Modal.com-geïnspireerde dark developer-tool palette. Semantische tokens (bg /
// surface / border / fg / accent …) i.p.v. losse kleurnamen, zodat de hele app
// centraal bij te stellen is en componenten hun bedoeling uitdrukken. Groen =
// primair/actief/geslaagd, rood = attentie/mislukt, amber = waarschuwing.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0E",
        surface: {
          DEFAULT: "#141417",
          2: "#1B1B1F",
          3: "#232329",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.14)",
        },
        fg: {
          DEFAULT: "#F4F4F5",
          muted: "#9A9AA3",
          faint: "#6B6B73",
        },
        accent: {
          DEFAULT: "#7FEE64",
          hover: "#93F27C",
          dim: "rgba(127,238,100,0.14)",
        },
        danger: {
          DEFAULT: "#F26D6D",
          dim: "rgba(242,109,109,0.14)",
        },
        warn: {
          DEFAULT: "#E7B84B",
          dim: "rgba(231,184,75,0.14)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(127,238,100,0.6), 0 0 20px -6px rgba(127,238,100,0.5)",
        "glow-sm": "0 0 0 1px rgba(127,238,100,0.45), 0 0 12px -6px rgba(127,238,100,0.4)",
        panel: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -16px rgba(0,0,0,0.8)",
      },
    },
  },
  plugins: [],
};

export default config;
