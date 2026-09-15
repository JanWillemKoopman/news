"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Melding } from "@/components/Toast";
import type { NotitieSoort } from "@/lib/notities";
import { STREAK_BONUS, berekenSeizoen, puntenVoor, type Seizoen } from "@/lib/punten";
import { weekVenstersTussen } from "@/lib/week";

/**
 * De vorm waarin de tabbladen Scores en Kennis en acties met berichten werken.
 *
 * Dit zijn dezelfde rijen als het besluitenlogboek per campagne
 * (`lib/campagneNotities.ts`), maar bewust als een eigen, smal type: de metriek en het
 * nulpunt horen bij de campagnekolom waar ze zijn ingevuld, niet bij deze overzichten.
 * `afgerondOp` hoort er wél bij — de actietabel vinkt af.
 */
export interface Bericht {
  id: string;
  campagneNaam: string;
  tekst: string;
  soort: NotitieSoort;
  afgerondOp: string | null;
  aangemaaktDoor: string;
  aangemaaktOp: string;
}

export interface Profiel {
  id: string;
  naam: string | null;
  avatarUrl: string | null;
}

type TeamDataValue = {
  ingelogd: boolean;
  /** De ingelogde collega zelf — nodig om "jij" te kunnen tonen. */
  eigenId: string | null;
  eigenNaam: string | null;
  eigenAvatarUrl: string | null;
  berichten: Bericht[];
  profielen: Profiel[];
  profielPerId: Record<string, Profiel>;
  laden: boolean;
  fout: string | null;
  /** De weken, streaks, medailles en totaalstand — één keer berekend voor alle panelen. */
  seizoen: Seizoen;
  /** Het peilmoment; tikt elke minuut door zodat de week vanzelf omslaat. */
  nu: Date;
  voegToe: (bericht: Bericht, profiel: Profiel | null) => void;
  /** De zijbalk om een bericht vast te leggen; hij hoort bij het venster, niet bij één tabblad. */
  zijbalkOpen: boolean;
  openZijbalk: () => void;
  sluitZijbalk: () => void;
  /** De korte bevestiging rechtsonder na het vastleggen van een bericht. */
  melding: Melding | null;
  wisMelding: () => void;
  /** Vinkt een actie af (of heropent hem) — direct zichtbaar, daarna pas opgeslagen. */
  zetActie: (bericht: Bericht, afgerond: boolean) => Promise<void>;
  /**
   * Mag deze collega berichten van iedereen verwijderen? Waar (alleen de twee
   * beheeraccounts) staat de prullenbak in de berichtentabel; zie
   * lib/gebruikersbeheer.ts. Server-side afgedwongen in de DELETE-route en in de
   * RLS-policy op de tabel — dit is alleen wat de knop laat zien.
   */
  magAllesVerwijderen: boolean;
  /** Gooit een bericht weg. De rij verdwijnt pas als de server het heeft bevestigd. */
  verwijderBericht: (bericht: Bericht) => Promise<void>;
};

const TeamDataContext = createContext<TeamDataValue | null>(null);

/** Elke minuut opnieuw kijken hoe laat het is; genoeg voor een reset op de minuut. */
const TIK_MS = 60 * 1000;

/**
 * Eén ophaalactie voor alles wat het team zelf vastlegt, gedeeld door het tabblad Scores
 * en het tabblad Kennis en acties.
 *
 * Waarom een provider en geen fetch per tabblad: beide tabbladen staan altijd gemount
 * (zie AppShell) en kijken naar exact dezelfde rijen. Twee keer ophalen betekent twee
 * keer wachten én, erger, twee standen die na het vastleggen van een bericht uit elkaar
 * lopen — je legt iets vast op het ene tabblad en je punten kloppen niet op het andere.
 * Nu werkt `voegToe` beide tegelijk bij.
 */
export function TeamDataProvider({
  ingelogd,
  eigenId,
  eigenNaam,
  eigenAvatarUrl,
  magAllesVerwijderen,
  children,
}: {
  ingelogd: boolean;
  eigenId: string | null;
  eigenNaam: string | null;
  eigenAvatarUrl: string | null;
  /** Komt uit `isBeheerder(email)` op de server — het e-mailadres zelf blijft daar. */
  magAllesVerwijderen: boolean;
  children: ReactNode;
}) {
  const [berichten, setBerichten] = useState<Bericht[] | null>(null);
  const [profielen, setProfielen] = useState<Profiel[]>([]);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [nu, setNu] = useState(() => new Date());
  const [zijbalkOpen, setZijbalkOpen] = useState(false);
  const [melding, setMelding] = useState<Melding | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNu(new Date()), TIK_MS);
    return () => clearInterval(timer);
  }, []);

  /**
   * Ophalen, met één herkansing als de server zegt dat we niet zijn ingelogd.
   *
   * Deze fetch vertrekt op het moment dat de pagina laadt — eerder dan elk ander
   * gegevensverzoek in de app. Loopt hij vlak achter een sessieverversing aan, dan kan hij
   * nog met het net vervangen token op pad zijn en krijgt hij een 401, terwijl de pagina
   * eromheen wél is ingelogd. De middleware ververst inmiddels op elke route, wat dat gat
   * dicht; deze herkansing is de riem op de bretel, want één mislukte race hoort geen leeg
   * scoretabblad op te leveren.
   *
   * En blijft het mislukken, dan is "Log eerst in." — de tekst die de server teruggeeft —
   * precies de verkeerde zin voor iemand die zichtbaar ís ingelogd. Dan zeggen we wat er
   * aan de hand is en wat eraan helpt.
   */
  useEffect(() => {
    if (!ingelogd) return;
    let genegeerd = false;
    setLaden(true);
    setFout(null);

    async function haalOp(): Promise<void> {
      let antwoord = await fetch("/api/kennis-en-acties");
      if (antwoord.status === 401) {
        await new Promise((klaar) => setTimeout(klaar, 800));
        if (genegeerd) return;
        antwoord = await fetch("/api/kennis-en-acties");
      }
      if (genegeerd) return;

      if (antwoord.status === 401) {
        throw new Error(
          "Je sessie is verlopen terwijl deze pagina openstond. Laad de pagina opnieuw; " +
            "blijft dit staan, log dan opnieuw in.",
        );
      }

      const json = (await antwoord.json()) as {
        items?: Bericht[];
        profielen?: Profiel[];
        fout?: string;
      };
      if (genegeerd) return;
      if (json.fout) throw new Error(json.fout);
      setBerichten(json.items ?? []);
      setProfielen(json.profielen ?? []);
    }

    haalOp()
      .catch((err: unknown) => {
        if (!genegeerd) {
          setFout(err instanceof Error ? err.message : "Kon de berichten niet ophalen.");
        }
      })
      .finally(() => {
        if (!genegeerd) setLaden(false);
      });

    return () => {
      genegeerd = true;
    };
  }, [ingelogd]);

  const alles = useMemo(() => berichten ?? [], [berichten]);

  const profielPerId = useMemo(() => {
    const map: Record<string, Profiel> = {};
    for (const profiel of profielen) map[profiel.id] = profiel;
    return map;
  }, [profielen]);

  // Het seizoen loopt vanaf het oudste bericht t/m de week van nu; zonder berichten is
  // dat alleen de lopende week, zodat de panelen altijd een stand hebben om te tonen.
  const seizoen = useMemo(() => {
    const oudste = alles.reduce<number | null>((min, bericht) => {
      const t = new Date(bericht.aangemaaktOp).getTime();
      return Number.isFinite(t) && (min === null || t < min) ? t : min;
    }, null);
    const vensters = weekVenstersTussen(oudste === null ? nu : new Date(oudste), nu);
    return berekenSeizoen(alles, vensters, nu);
  }, [alles, nu]);

  const voegToe = useCallback(
    (bericht: Bericht, profiel: Profiel | null) => {
      setBerichten((huidig) => [bericht, ...(huidig ?? [])]);
      if (profiel) {
        setProfielen((huidig) =>
          huidig.some((p) => p.id === profiel.id) ? huidig : [...huidig, profiel],
        );
      }

      // De bevestiging wordt hier gemaakt en niet in de zijbalk: dit is de enige plek
      // die weet wat dit bericht met de weekstand doet. Was het het eerste bericht van
      // de week én liep er een reeks, dan is de streakbonus er nu ook bij verdiend.
      const punten = puntenVoor(bericht.soort);
      const alGedaan = seizoen.huidige.perGebruiker[bericht.aangemaaktDoor]?.aantal ?? 0;
      const reeks = seizoen.vorige?.perGebruiker[bericht.aangemaaktDoor]?.streak ?? 0;
      const bonus = alGedaan === 0 && reeks > 0 ? STREAK_BONUS : 0;
      setMelding({
        titel: `+${punten + bonus} punten`,
        regel: bonus
          ? `Vastgelegd — en je reeks staat op ${reeks + 1} weken (+${bonus}).`
          : "Vastgelegd. Het staat meteen in de weekstand.",
      });
    },
    [seizoen],
  );

  // Stabiele referenties: Toast hangt zijn timer aan `onWeg`, en die zou bij een nieuwe
  // functie per render telkens opnieuw beginnen — de melding bleef dan staan.
  const openZijbalk = useCallback(() => setZijbalkOpen(true), []);
  const sluitZijbalk = useCallback(() => setZijbalkOpen(false), []);
  const wisMelding = useCallback(() => setMelding(null), []);

  const zetActie = useCallback(async (bericht: Bericht, afgerond: boolean) => {
    // Eerst in beeld, dan pas naar de server: afvinken hoort direct te voelen. Mislukt
    // het, dan zetten we de oude waarde uit `bericht` gewoon terug — daarom neemt deze
    // functie de hele regel aan en niet alleen zijn id.
    const zetten = (waarde: string | null) =>
      setBerichten((huidig) =>
        (huidig ?? []).map((b) => (b.id === bericht.id ? { ...b, afgerondOp: waarde } : b)),
      );

    zetten(afgerond ? new Date().toISOString() : null);
    setFout(null);
    try {
      const res = await fetch(`/api/campagne-notities/${bericht.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afgerond }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { fout?: string };
        throw new Error(json.fout ?? "Kon de actie niet bijwerken.");
      }
    } catch (err) {
      zetten(bericht.afgerondOp);
      setFout(err instanceof Error ? err.message : "Kon de actie niet bijwerken.");
    }
  }, []);

  /**
   * Verwijderen gaat andersom dan afvinken: eerst de server, dan pas het scherm.
   *
   * Een afvinkje dat mislukt zet je zonder schade terug; een weggehaalde regel die
   * terugkomt omdat de server "mag niet" zei, is een bericht dat je dacht te hebben
   * opgeruimd. Dus verdwijnt hij pas als hij écht weg is.
   */
  const verwijderBericht = useCallback(async (bericht: Bericht) => {
    setFout(null);
    const res = await fetch(`/api/campagne-notities/${bericht.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { fout?: string };
      const melding = json.fout ?? "Kon het bericht niet verwijderen.";
      setFout(melding);
      throw new Error(melding);
    }
    setBerichten((huidig) => (huidig ?? []).filter((b) => b.id !== bericht.id));
  }, []);

  const value: TeamDataValue = {
    ingelogd,
    eigenId,
    eigenNaam,
    eigenAvatarUrl,
    berichten: alles,
    profielen,
    profielPerId,
    laden: laden && berichten === null,
    fout,
    seizoen,
    nu,
    voegToe,
    zijbalkOpen,
    openZijbalk,
    sluitZijbalk,
    melding,
    wisMelding,
    zetActie,
    magAllesVerwijderen,
    verwijderBericht,
  };

  return <TeamDataContext.Provider value={value}>{children}</TeamDataContext.Provider>;
}

export function useTeamData(): TeamDataValue {
  const context = useContext(TeamDataContext);
  if (!context) {
    throw new Error("useTeamData moet binnen een TeamDataProvider gebruikt worden");
  }
  return context;
}
