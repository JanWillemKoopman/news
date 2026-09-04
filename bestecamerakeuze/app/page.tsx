import CampaignDashboard from "@/components/CampaignDashboard";
import { getCampagnes } from "@/lib/sheet";

// De sheet kan buiten deze app om wijzigen, dus geen statische generatie: elke
// requestie haalt de actuele data op.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const campagnes = await getCampagnes();

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:py-12">
      <h1 className="font-sans-w7 text-2xl font-bold text-ink sm:text-3xl">Campagnedashboard</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Live overzicht vanuit de Google Sheet — campagnes naast elkaar, gesorteerd op startdatum.
      </p>

      <div className="mt-6">
        <CampaignDashboard campagnes={campagnes} />
      </div>
    </main>
  );
}
