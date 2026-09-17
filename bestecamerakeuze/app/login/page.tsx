import { redirect } from "next/navigation";
import InlogFormulier from "@/components/login/InlogFormulier";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { IconLock } from "@/components/icons";
import { getGebruiker } from "@/lib/auth";
import { isSupabaseGeconfigureerd } from "@/lib/config";
import { veiligVerder } from "@/lib/toegang";

/**
 * Het inlogscherm: één formulier, gecentreerd op het warme paginavlak.
 *
 * Het formulier staat in een dragend paneel met een accentlijn erboven en een haarlijn
 * net binnen de rand — de twee details waarmee elk theme zijn eigen afwerking op een
 * kaart legt. Verder niets eromheen: het scherm heeft één handeling, en die hoort
 * midden in beeld te staan.
 *
 * Alles staat in semantische tokens, dus het inlogscherm verandert net zo goed mee met
 * het oogje rechtsboven als de rest van het dashboard; controleer bij wijzigingen ook
 * even Audi of CUPRA (de twee donkere themes).
 *
 * Dit is de enige pagina die zonder sessie te bereiken is; al het andere staat achter
 * de inlog (`middleware.ts`).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verder?: string }>;
}) {
  // `verder` is de plek waar de bezoeker heen wilde voordat hij hier belandde. Het
  // dashboard is één pagina met het tabblad in de URL, dus zonder dit zou een gedeelde
  // link naar bijvoorbeeld Kosten na het inloggen op Campagnes uitkomen.
  const verder = veiligVerder((await searchParams).verder);

  // Wie al ingelogd is heeft hier niets te zoeken. Zonder dit zou de terugknop na het
  // inloggen een leeg inlogformulier tonen aan iemand die gewoon binnen is.
  const gebruiker = await getGebruiker();
  if (gebruiker) redirect(verder);

  const geconfigureerd = isSupabaseGeconfigureerd();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <ThemeSwitcher />

      <main className="w-full max-w-[26rem]">
        <div className="kaart-accent kaart-omlijst rounded-panel border border-line bg-card px-10 py-11 shadow-card">
          <p className="label-theme text-label text-ink-faint">Marketing dashboard</p>
          <h1 className="titel-theme mt-3 text-ink">Welkom terug</h1>

          {geconfigureerd ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Log in met het e-mailadres en wachtwoord die je van Udenhout hebt
                gekregen.
              </p>

              <div className="mt-9">
                <InlogFormulier verder={verder} />
              </div>
            </>
          ) : (
            /* Zonder Supabase is er niets om tegen in te loggen. Het dashboard blijft
               dan dicht (dat is de bedoeling), maar dan hoort hier wel te staan waaróm
               niemand erin komt — anders zoekt de volgende persoon in het verkeerde
               hoekje. */
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Inloggen kan nu niet: deze omgeving mist de verbinding met Supabase
              (NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Zolang
              die ontbreekt blijft het dashboard gesloten. Vraag iemand met toegang tot
              Vercel om die twee instellingen te zetten.
            </p>
          )}

          <p className="mt-9 flex items-center gap-2.5 border-t border-line-soft pt-6 text-meta text-ink-faint">
            <IconLock className="h-[14px] w-[14px] shrink-0" />
            Beveiligde verbinding — je sessie blijft op dit apparaat.
          </p>
        </div>

        <p className="mt-6 px-1 text-meta text-ink-faint">
          Nog geen account? Vraag iemand met toegang tot Supabase om er een voor je aan te
          maken.
        </p>
      </main>
    </div>
  );
}
