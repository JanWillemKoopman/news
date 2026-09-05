import CampaignDashboard from "@/components/CampaignDashboard";
import DashboardTabs from "@/components/DashboardTabs";
import ChatPaneel from "@/components/chat/ChatPaneel";
import KennisPaneel from "@/components/kennis/KennisPaneel";
import NietGeconfigureerd from "@/components/NietGeconfigureerd";
import { getCampagnes } from "@/lib/sheet";
import { getGebruiker } from "@/lib/auth";
import { chatGereedheid } from "@/lib/config";

// De sheet kan buiten deze app om wijzigen, dus geen statische generatie: elke
// requestie haalt de actuele data op.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const campagnes = await getCampagnes();
  const gereed = chatGereedheid();
  const gebruiker = gereed.gereed ? await getGebruiker() : null;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:py-12">
      <h1 className="font-sans-w7 text-2xl font-bold text-ink sm:text-3xl">Campagnedashboard</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Live overzicht vanuit de Google Sheet — campagnes naast elkaar, gesorteerd op startdatum.
      </p>

      <div className="mt-6">
        <DashboardTabs
          campagnes={<CampaignDashboard campagnes={campagnes} />}
          chat={
            gereed.gereed ? (
              <ChatPaneel ingelogd={Boolean(gebruiker)} />
            ) : (
              <NietGeconfigureerd ontbreekt={gereed.ontbreekt} />
            )
          }
          kennis={
            gereed.gereed ? (
              <KennisPaneel ingelogd={Boolean(gebruiker)} />
            ) : (
              <NietGeconfigureerd ontbreekt={gereed.ontbreekt} />
            )
          }
        />
      </div>
    </main>
  );
}
