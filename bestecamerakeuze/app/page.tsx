import AppShell from "@/components/AppShell";
import CampaignDashboard from "@/components/CampaignDashboard";
import ChatPaneel from "@/components/chat/ChatPaneel";
import KennisPaneel from "@/components/kennis/KennisPaneel";
import KostenPaneel from "@/components/kosten/KostenPaneel";
import NietGeconfigureerd from "@/components/NietGeconfigureerd";
import { getCampagnes } from "@/lib/sheet";
import { getGebruiker } from "@/lib/auth";
import { chatGereedheid, isSupabaseGeconfigureerd } from "@/lib/config";
import { formatUpdatedAt } from "@/lib/format";

// De sheet kan buiten deze app om wijzigen, dus geen statische generatie: elke
// requestie haalt de actuele data op.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const campagnes = await getCampagnes();
  const gereed = chatGereedheid();
  // getGebruiker() checkt zelf al of Supabase geconfigureerd is en geeft anders null
  // terug — losgekoppeld van chatGereedheid(), want de aantekeningen bij de campagnes
  // hebben alleen Supabase nodig, niet de dataverbinding of de Claude-sleutel.
  const gebruiker = await getGebruiker();
  const ingelogd = Boolean(gebruiker);

  const liveCount = campagnes.filter((c) => c.status.trim().toLowerCase() === "open").length;
  const updatedAt = formatUpdatedAt(new Date());

  return (
    <AppShell
      gebruikerEmail={gebruiker?.email ?? null}
      liveCount={liveCount}
      updatedAt={updatedAt}
      campagnes={
        <CampaignDashboard
          campagnes={campagnes}
          notitiesBeschikbaar={isSupabaseGeconfigureerd()}
          ingelogd={ingelogd}
        />
      }
      chat={
        gereed.gereed ? (
          <ChatPaneel ingelogd={ingelogd} />
        ) : (
          <NietGeconfigureerd ontbreekt={gereed.ontbreekt} />
        )
      }
      kennis={
        gereed.gereed ? (
          <KennisPaneel ingelogd={ingelogd} />
        ) : (
          <NietGeconfigureerd ontbreekt={gereed.ontbreekt} />
        )
      }
      kosten={
        gereed.gereed ? (
          <KostenPaneel ingelogd={ingelogd} />
        ) : (
          <NietGeconfigureerd ontbreekt={gereed.ontbreekt} />
        )
      }
    />
  );
}
