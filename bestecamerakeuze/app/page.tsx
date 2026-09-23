import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import CampaignDashboard from "@/components/CampaignDashboard";
import CampagneBeheer from "@/components/beheer/CampagneBeheer";
import AccountPaneel from "@/components/kanalen/AccountPaneel";
import GoogleAdsPaneel from "@/components/kanalen/GoogleAdsPaneel";
import Koppeltabel from "@/components/kanalen/Koppeltabel";
import OrganischPaneel from "@/components/kanalen/OrganischPaneel";
import SocialAdsPaneel from "@/components/kanalen/SocialAdsPaneel";
import WebsitePaneel from "@/components/kanalen/WebsitePaneel";
import ChatPaneel from "@/components/chat/ChatPaneel";
import InstellingenPaneel from "@/components/instellingen/InstellingenPaneel";
import KennisEnActies from "@/components/kennisacties/KennisEnActies";
import ScorePaneel from "@/components/scores/ScorePaneel";
import KennisPaneel from "@/components/kennis/KennisPaneel";
import BudgetBeheer from "@/components/monitoren/BudgetBeheer";
import KostenPaneel from "@/components/kosten/KostenPaneel";
import NietGeconfigureerd from "@/components/NietGeconfigureerd";
import PrikbordPaneel from "@/components/prikbord/PrikbordPaneel";
import CampagneTijdlijn from "@/components/tijdlijn/CampagneTijdlijn";
import { getCampagnes } from "@/lib/sheet";
import { getGebruiker } from "@/lib/auth";
import { CampagneFilterProvider } from "@/lib/campagneFilterContext";
import { chatGereedheid, isSupabaseGeconfigureerd } from "@/lib/config";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import { TeamDataProvider } from "@/lib/teamData";
import { isCampagneLive } from "@/lib/format";
import { haalProfiel } from "@/lib/profielen";
import { createClient } from "@/lib/supabase/server";

// De sheet kan buiten deze app om wijzigen, dus geen statische generatie: elke
// requestie haalt de actuele data op.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Het hele dashboard zit achter de inlog. De middleware stuurt een bezoeker zonder
  // sessie al weg (`middleware.ts`), maar de pagina controleert het hier nog een keer
  // zelf: een gat in de matcher mag geen open dashboard opleveren. Deze controle staat
  // bewust vóór het ophalen van de sheet — voor wie niet ingelogd is, valt er niets op
  // te halen.
  //
  // getGebruiker() checkt zelf al of Supabase geconfigureerd is en geeft anders null
  // terug — losgekoppeld van chatGereedheid(), want de aantekeningen bij de campagnes
  // hebben alleen Supabase nodig, niet de dataverbinding of de Claude-sleutel.
  const gebruiker = await getGebruiker();
  if (!gebruiker) redirect("/login");

  const campagnes = await getCampagnes();
  const gereed = chatGereedheid();
  // Voorbij de redirect hierboven is er altijd een sessie. De panelen houden hun eigen
  // `ingelogd`-controle als derde slot (naast de middleware en de controle hier), en
  // elke API-route controleert daarnaast zijn eigen verzoek.
  const ingelogd = true;

  const profiel = await haalProfiel(await createClient(), gebruiker.id).catch(() => null);

  const liveCount = campagnes.filter((c) => isCampagneLive(c)).length;

  return (
    <CampagneFilterProvider campagnes={campagnes}>
      {/* Eén ophaalactie voor alles wat het team zelf vastlegt, gedeeld door de
          tabbladen Scores en Kennis en acties (en door de weekwinnaar-pop-up in
          AppShell) — zie lib/teamData.tsx. */}
      <TeamDataProvider
        ingelogd={ingelogd}
        eigenId={gebruiker.id}
        eigenNaam={profiel?.naam ?? null}
        eigenAvatarUrl={profiel?.avatarUrl ?? null}
        magAllesVerwijderen={isBeheerder(gebruiker.email)}
      >
        <AppShell
        gebruikerEmail={gebruiker.email}
        profielNaam={profiel?.naam ?? null}
        profielAvatarUrl={profiel?.avatarUrl ?? null}
        liveCount={liveCount}
        ingelogd={ingelogd}
        scores={<ScorePaneel />}
        kennisacties={<KennisEnActies />}
        campagnes={
          <CampaignDashboard notitiesBeschikbaar={isSupabaseGeconfigureerd()} ingelogd={ingelogd} />
        }
        tijdlijn={<CampagneTijdlijn />}
        campagnebeheer={<CampagneBeheer ingelogd={ingelogd} />}
        socialAds={<SocialAdsPaneel ingelogd={ingelogd} />}
        googleAds={<GoogleAdsPaneel ingelogd={ingelogd} />}
        organisch={<OrganischPaneel ingelogd={ingelogd} />}
        accountOntwikkeling={<AccountPaneel ingelogd={ingelogd} />}
        website={<WebsitePaneel ingelogd={ingelogd} />}
        koppeltabel={<Koppeltabel ingelogd={ingelogd} />}
        budgetBeheer={<BudgetBeheer ingelogd={ingelogd} />}
        prikbord={
          gereed.gereed ? (
            <PrikbordPaneel ingelogd={ingelogd} />
          ) : (
            <NietGeconfigureerd ontbreekt={gereed.ontbreekt} />
          )
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
        instellingen={<InstellingenPaneel ingelogd={ingelogd} email={gebruiker.email} />}
        />
      </TeamDataProvider>
    </CampagneFilterProvider>
  );
}
