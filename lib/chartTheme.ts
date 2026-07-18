// Recharts' built-in <Tooltip> gets its colors via inline styles (Tailwind classes don't
// reach that DOM), so the app's surface/border/fg tokens are mirrored here for the simpler
// charts. Charts with a custom `content` component (ShareTooltip/RoasTooltip in
// ResultsCharts.tsx) style themselves with Tailwind tokens directly.
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#FFFFFF",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 8,
    boxShadow: "0 8px 24px -12px rgba(0,0,0,0.15)",
    fontSize: 12,
    color: "#1D1D1F",
  },
  labelStyle: { color: "#6E6E73", marginBottom: 2 },
  itemStyle: { color: "#1D1D1F" },
} as const;

// Backwards-compat alias (oude naam uit het donkere thema).
export const DARK_TOOLTIP_STYLE = CHART_TOOLTIP_STYLE;
