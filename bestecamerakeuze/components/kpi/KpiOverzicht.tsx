/**
 * Het Looker Studio-dashboard (voorheen Data Studio) met de KPI's, ingebed over de volle
 * breedte en de resterende hoogte van het scherm. De hoogte trekt de paginakop (±9rem
 * inclusief de marges van <main>) ervan af, zodat er geen tweede scrollbalk naast de
 * pagina ontstaat.
 */
const KPI_RAPPORT_URL =
  "https://datastudio.google.com/embed/reporting/5e31239f-f5d2-40bf-8d28-eff32c49935b/page/p_mwj0aft61d";

export default function KpiOverzicht() {
  return (
    <iframe
      title="KPI overzicht"
      src={KPI_RAPPORT_URL}
      allowFullScreen
      sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="block h-[calc(100vh-9rem)] min-h-[600px] w-full rounded-card border-0 bg-card"
    />
  );
}
