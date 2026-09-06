/**
 * Maakt een collega-account aan (of zet het wachtwoord van een bestaand account) zodat
 * je direct een e-mailadres + wachtwoord kunt doorgeven — geen inlogmail nodig.
 *
 * Draait los van de Next-app met de Supabase **service role**-sleutel, die nergens in
 * de app zelf mag staan (die geeft volledige toegang, voorbij alle rijbeveiliging).
 * Vandaar een los script in plaats van een knop in de UI.
 *
 * Gebruik:
 *   node --env-file=.env.local --experimental-strip-types scripts/maak-gebruiker.ts \
 *     --email=collega@udenhout.nl --wachtwoord="EenSterkWachtwoord123" --naam="Voornaam Achternaam"
 *
 * (of via `npm run gebruiker:maak -- --email=... --wachtwoord=... --naam=...`)
 *
 * Draait het account al? Dan wordt gewoon het wachtwoord bijgewerkt — handig om
 * hetzelfde commando te gebruiken voor "wachtwoord vergeten".
 */
import { createClient } from "@supabase/supabase-js";

function leesArg(naam: string): string | null {
  const prefix = `--${naam}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const email = leesArg("email")?.trim();
const wachtwoord = leesArg("wachtwoord");
const naam = leesArg("naam")?.trim() || null;

if (!email || !wachtwoord) {
  console.error(
    'Gebruik: node --env-file=.env.local --experimental-strip-types scripts/maak-gebruiker.ts --email=... --wachtwoord=... [--naam="Voornaam Achternaam"]',
  );
  process.exit(1);
}
if (wachtwoord.length < 8) {
  console.error("Het wachtwoord moet minimaal 8 tekens zijn (Supabase-eis).");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY moeten allebei gezet zijn " +
      "(zie .env.example — de service role-sleutel staat in Supabase onder " +
      "Project Settings → API, en gaat NOOIT in NEXT_PUBLIC_-variabelen of in de app zelf).",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Losse, expliciet getypeerde bindingen: de bovenstaande checks bewijzen dat deze
// waarden geen null/undefined meer zijn, maar TypeScript onthoudt die vernauwing niet
// binnen de closure van main() hieronder.
const emailWaarde: string = email;
const wachtwoordWaarde: string = wachtwoord;

async function main() {
  const { data: aangemaakt, error: aanmaakFout } = await admin.auth.admin.createUser({
    email: emailWaarde,
    password: wachtwoordWaarde,
    email_confirm: true, // geen bevestigingsmail — het account werkt meteen
    user_metadata: naam ? { naam } : undefined,
  });

  let userId: string;

  if (aanmaakFout) {
    const bestaatAl = /already been registered|already exists/i.test(aanmaakFout.message);
    if (!bestaatAl) {
      console.error("Kon account niet aanmaken:", aanmaakFout.message);
      process.exit(1);
    }

    // Account bestaat al: wachtwoord (en eventueel naam) bijwerken in plaats van te falen.
    const { data: lijst, error: zoekFout } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (zoekFout) {
      console.error("Kon bestaand account niet vinden:", zoekFout.message);
      process.exit(1);
    }
    const bestaand = lijst.users.find((u) => u.email?.toLowerCase() === emailWaarde.toLowerCase());
    if (!bestaand) {
      console.error(`Account met ${emailWaarde} bestaat volgens Supabase, maar is niet gevonden.`);
      process.exit(1);
    }

    const { error: updateFout } = await admin.auth.admin.updateUserById(bestaand.id, {
      password: wachtwoordWaarde,
    });
    if (updateFout) {
      console.error("Kon wachtwoord niet bijwerken:", updateFout.message);
      process.exit(1);
    }
    userId = bestaand.id;
    console.log(`Account voor ${emailWaarde} bestond al — wachtwoord is bijgewerkt.`);
  } else {
    userId = aangemaakt.user.id;
    console.log(`Account aangemaakt voor ${emailWaarde}.`);
  }

  if (naam) {
    const { error: profielFout } = await admin
      .schema("dataloket")
      .from("profielen")
      .update({ naam })
      .eq("id", userId);
    if (profielFout) {
      // De profielrij wordt automatisch aangemaakt door een trigger op auth.users; als
      // die nog niet gedraaid heeft (net aangemaakt) kan deze update nog niets vinden.
      console.warn(
        `Account is in orde, maar de naam kon niet worden ingesteld (${profielFout.message}). ` +
          "De collega kan dit zelf nog aanpassen bij Instellingen.",
      );
    }
  }

  console.log("\nGeef deze inloggegevens door:");
  console.log(`  E-mailadres: ${emailWaarde}`);
  console.log(`  Wachtwoord:  ${wachtwoordWaarde}`);
}

main();
