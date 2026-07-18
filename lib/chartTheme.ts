// Recharts' built-in <Tooltip> renders a plain white box by default — jarring against the
// app's Modal.com-style dark theme. Charts with a custom `content` component (see
// ShareTooltip/RoasTooltip in ResultsCharts.tsx) style themselves with Tailwind tokens
// directly; this constant is for the simpler charts that just need the default tooltip's
// colors overridden via its contentStyle/labelStyle/itemStyle props. Values mirror
// tailwind.config.ts's surface/border/fg tokens (Tailwind classes don't reach Recharts'
// inline-styled tooltip DOM, so the hex/rgba values are duplicated here).
export const DARK_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#141417",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    boxShadow: "0 8px 24px -16px rgba(0,0,0,0.8)",
    fontSize: 12,
    color: "#F4F4F5",
  },
  labelStyle: { color: "#9A9AA3", marginBottom: 2 },
  itemStyle: { color: "#F4F4F5" },
} as const;
