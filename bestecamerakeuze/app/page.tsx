import AppShell from "@/components/AppShell";
import CampaignDashboard from "@/components/CampaignDashboard";
import ChatPaneel from "@/components/chat/ChatPaneel";
import KennisPaneel from "@/components/kennis/KennisPaneel";
import KostenPaneel from "@/components/kosten/KostenPaneel";
import NietGeconfigureerd from "@/components/NietGeconfigureerd";
import { getCampagnes } from "@/lib/sheet";
import { getGebruiker } from "@/lib/auth";
import { chatGereedheid } from "@/lib/config";
import { formatUpdatedAt } from "@/lib/format";

// De sheet kan buiten deze app om wijzigen, dus geen statische generatie: elke
// requestie haalt de actuele data op.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const campagnes = await getCampagnes();
  const gereed = chatGereedheid();
  const gebruiker = gereed.gereed ? await getGebruiker() : null;

  const liveCount = campagnes.filter((c) => c.status.trim().toLowerCase() === "open").length;
  const updatedAt = formatUpdatedAt(new Date());

  return (
    <AppShell
      gebruikerEmail={gebruiker?.email ?? null}
      liveCount={liveCount}
      updatedAt={updatedAt}
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
      kosten={
        gereed.gereed ? (
          <KostenPaneel ingelogd={Boolean(gebruiker)} />
        ) : (
          <NietGeconfigureerd ontbreekt={gereed.ontbreekt} />
        )
      }
    />
  );
}
