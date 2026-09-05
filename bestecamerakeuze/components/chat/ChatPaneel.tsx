"use client";

import dynamic from "next/dynamic";

/**
 * Laadt het hele chatpaneel pas wanneer het nodig is.
 *
 * De chat draagt grafieken, markdown-opmaak en de gesprekkenlijst met zich mee — bij
 * elkaar honderden kilobytes. Wie alleen de campagnetabel bekijkt, hoort daar niets van
 * te merken. Vandaar dat de scheidslijn hier ligt en niet dieper in de componentboom.
 */
const DataChat = dynamic(() => import("@/components/DataChat"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="h-56 w-full shrink-0 rounded-panel border border-line bg-surface lg:w-72" />
      <div className="h-56 flex-1 rounded-panel border border-line bg-surface" />
    </div>
  ),
});

export default function ChatPaneel({ ingelogd }: { ingelogd: boolean }) {
  return <DataChat ingelogd={ingelogd} />;
}
