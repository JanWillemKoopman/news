/** Groene dot + het aantal live campagnes — herberekend uit de actuele data, geen vaste tekst. */
export default function LiveStatus({ liveCount }: { liveCount: number }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-ink-muted">
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-open" />
      <span className="font-medium text-ink">{liveCount}</span> campagnes live
    </span>
  );
}
