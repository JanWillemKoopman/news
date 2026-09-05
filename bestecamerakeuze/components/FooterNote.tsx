import { IconInfo } from "@/components/icons";

/** Kleine, subtiele systeeminformatie — mag niet concurreren met de campagnedata erboven. */
export default function FooterNote() {
  return (
    <p className="mt-8 flex items-start gap-1.5 text-xs leading-relaxed text-ink-faint">
      <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Data komt live uit de Google Sheet (tabblad &quot;Campagnes&quot;) en wordt bij elk bezoek
      opnieuw opgehaald.
    </p>
  );
}
