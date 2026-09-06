/** Kleine statusdot + label — bewust geen zware pill-badge, zie CampaignTable. */
export default function StatusIndicator({ status }: { status: string }) {
  const isOpen = status.trim().toLowerCase() === "open";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isOpen ? "bg-open status-dot-ademen" : "bg-closed"}`}
      />
      {status || "—"}
    </span>
  );
}
