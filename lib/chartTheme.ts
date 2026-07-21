// Recharts' built-in <Tooltip> gets its colors via inline styles (Tailwind classes don't
// reach that DOM), so the app's surface/border/fg tokens are mirrored here for the simpler
// charts. Charts with a custom `content` component (ShareTooltip/RoasTooltip in
// ResultsCharts.tsx) style themselves with Tailwind tokens directly.
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#FDFBF6",
    border: "1px solid rgba(30,57,50,0.12)",
    borderRadius: 14,
    boxShadow: "0 14px 34px -16px rgba(30,57,50,0.28)",
    fontSize: 12,
    color: "#1E3932",
  },
  labelStyle: { color: "#4C5F57", marginBottom: 2 },
  itemStyle: { color: "#1E3932" },
} as const;

// Backwards-compat alias (oude naam uit het donkere thema).
export const DARK_TOOLTIP_STYLE = CHART_TOOLTIP_STYLE;
