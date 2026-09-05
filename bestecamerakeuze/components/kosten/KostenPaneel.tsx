"use client";

import dynamic from "next/dynamic";

/** Laadt de kostenpagina pas bij gebruik, net als de chat en de kennisbank. */
const Kosten = dynamic(() => import("@/components/kosten/Kosten"), {
  ssr: false,
  loading: () => <div className="h-64 rounded-panel border border-line bg-surface" />,
});

export default function KostenPaneel({ ingelogd }: { ingelogd: boolean }) {
  return <Kosten ingelogd={ingelogd} />;
}
