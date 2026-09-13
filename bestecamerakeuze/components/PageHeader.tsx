import LiveStatus from "@/components/LiveStatus";
import GameInfoKnop from "@/components/GameInfoKnop";

type Props = {
  title: string;
  subtitle: string;
  /** Live-status hoort alleen bij het campagne-overzicht. */
  meta?: { liveCount: number };
  /** Game info hoort alleen bij Scores en Kennis en acties, niet bij Campagnes. */
  toonGameInfo?: boolean;
};

export default function PageHeader({ title, subtitle, meta, toonGameInfo }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="titel-theme text-ink">
          {title}
        </h1>
        <p className="mt-1.5 text-meta text-ink-muted">{subtitle}</p>
      </div>

      {(meta || toonGameInfo) && (
        <div className="flex flex-wrap items-center gap-4 pt-1.5">
          {meta && <LiveStatus liveCount={meta.liveCount} />}
          {meta && toonGameInfo && <span aria-hidden="true" className="h-3 w-px bg-line" />}
          {toonGameInfo && <GameInfoKnop />}
        </div>
      )}
    </div>
  );
}
