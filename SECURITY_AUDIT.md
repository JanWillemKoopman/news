# Security-audit — JanWillemKoopman/news (wedding-planner)

*Scope: publiek bereikbare onderdelen en misbruik door buitenstaanders. Datum: 2026-06-10.*

## In gewone taal

De app zit qua opzet goed in elkaar: wachtwoorden worden veilig versleuteld (scrypt),
geheime sleutels staan niet in de browsercode, RSVP- en uitnodigingslinks gebruiken
niet te raden tokens, en er zijn geen XSS-lekken gevonden. **Maar** er is één duidelijk
zwak punt: de **cadeaulijst (registry)**. Door een verkeerde instelling in de database
mag *iedereen op internet* — zonder in te loggen — reserveringen en bijdragen op de
cadeaulijst toevoegen, wijzigen of zelfs **verwijderen**. Daarnaast kan de "bedankt voor
je bijdrage"-mail misbruikt worden om vanuit het e-mailadres van het bruidspaar
spam/phishing naar willekeurige adressen te sturen. Die twee dingen zijn het belangrijkst
om eerst te repareren.

> **Waarom dit voor buitenstaanders bereikbaar is:** de app geeft elke bezoeker een
> anonieme sessie en de publieke Supabase-sleutel zit in de browsercode. Elke databaseregel
> die de "anonieme" rol schrijf- of verwijderrechten geeft, is daardoor rechtstreeks via de
> database-API te misbruiken — zónder de website te gebruiken.

## Bevindingen

| # | Locatie & Omschrijving | Impact | Inspanning | Oplossing |
|---|------------------------|--------|------------|-----------|
| 1 | **Cadeaulijst-database staat open voor iedereen** — `supabase/migrations/0012_registry.sql` (regels 102–158). De tabellen `registry_reservations` en `registry_contributions` geven de anonieme rol vrij spel: toevoegen (`with check (true)`), en **reserveringen verwijderen** (`using (true)`). Omdat de publieke Supabase-sleutel in de browsercode zit, kan een buitenstaander dit rechtstreeks via de database-API doen — buiten de website om. Gevolg: alle cadeau-reserveringen kunnen gewist worden, en er kunnen onbeperkt nep-reserveringen/-bijdragen aangemaakt worden. | **Kritiek** | **Medium** | Verwijder de open `anon`-policies voor INSERT/UPDATE/DELETE op deze tabellen. Laat alle schrijfacties uitsluitend via de bestaande `SECURITY DEFINER`-RPC's lopen (`reserve_registry_item`, `cancel_reservation_by_token`), die eigenaarschap en tokens controleren. |
| 2 | **"Bevestig bijdrage"-endpoint zonder inlog (e-mail-misbruik)** — `app/api/registry/contribute/confirm/route.ts`. Iedereen die een bijdrage-ID kent (zelf eerst aangemaakt via het open `contribute`-endpoint, met zelfgekozen naam/e-mail/bericht) kan dit aanroepen. Er wordt dan een e-mail verstuurd vanaf het domein van het bruidspaar naar een door de aanvaller gekozen adres → bruikbaar als **spam-/phishingkanaal**. De ingebouwde limiet zit in het geheugen en werkt niet betrouwbaar op Vercel (meerdere servers). | **Hoog** | **Medium** | Vereis authenticatie/eigenaarschap óf een apart geheim token per bijdrage. Vervang de in-memory limiet door de database-limiet (`lib/rateLimit.ts`). |
| 3 | **Bijdrage-endpoint zonder limiet/controles** — `app/api/registry/contribute/route.ts`. Geen snelheidslimiet, geen maximumbedrag, en geen controle of de cadeaulijst aanstaat. Onbeperkt aanmaken van bijdragen mogelijk. | **Medium** | **Laag** | Voeg database-rate-limiting toe (`checkRateLimit`), een maximumbedrag, en een controle op `registry_settings.is_enabled`. |
| 4 | **Snelheidslimieten in geheugen i.p.v. database** — `app/api/ai/budget/route.ts`, `app/api/ai/taken/route.ts`, `app/api/registry/contribute/confirm` en `.../confirm-receipt`. Op Vercel draaien meerdere servers; een geheugenlimiet is daardoor makkelijk te omzeilen → mogelijk misbruik van de (betaalde) AI-dienst. `app/api/ai/advice` doet het al goed (database-limiet). | **Medium** | **Laag** | Overal de bestaande database-limiet `checkRateLimit()` gebruiken in plaats van een lokale `Map`. |
| 5 | **Wachtwoordslot cadeaulijst is alleen client-side** — slot wordt onthouden in `sessionStorage`; te omzeilen via de browserconsole. Gevolg is beperkt: gevoelige bankgegevens (IBAN) worden serverseitig wél afgeschermd voor wachtwoord-beveiligde lijsten, dus alleen de lijst met cadeaus wordt zichtbaar. | **Laag** | **Medium** | Lijst-inhoud serverseitig pas vrijgeven ná geslaagde wachtwoordcontrole (controleer het wachtwoord in de RPC/route die de items teruggeeft). |
| 6 | **Zwakke minimale wachtwoordlengte (6 tekens)** — `supabase/config.toml` (`minimum_password_length = 6`). Maakt accounts kwetsbaarder voor raden/brute-force. | **Medium** | **Laag** | Zet op minimaal 10–12 tekens. |
| 7 | **Opslag-buckets niet in migraties** — `avatars` en `registry-images` worden in de code gebruikt (`store/bruiloftStore.ts`) maar zijn niet in de migraties gedefinieerd. Hun toegangsregels staan dus niet in versiebeheer en zijn niet te controleren; bij een verkeerde configuratie (publiek schrijfbaar) kan iedereen bestanden uploaden. | **Medium** | **Laag** | Definieer beide buckets + upload-/leespolicies in een migratie (zoals `wedding-media` al doet), met bestandstype- en groottelimiet. |
| 8 | **Ongebruikte database-functie met zwakke vergelijking** — `check_registry_password` (`0012_registry.sql:268`) staat open voor `anon` en vergelijkt platte tekst met een hash. Wordt niet gebruikt door de app (de echte route gebruikt veilige scrypt-vergelijking), dus niet direct misbruikbaar, maar het is dode, verwarrende code. | **Laag** | **Laag** | Verwijder de functie, of herschrijf hem zodat hij `verifyPassword`-logica gebruikt. |
| 9 | **Geen Content-Security-Policy (CSP)-header** — `next.config.mjs` zet goede headers (HSTS, X-Frame-Options, nosniff) maar geen CSP. Geen acuut lek (geen XSS gevonden), maar CSP is een extra vangnet. | **Laag** | **Medium** | Voeg een strikte CSP-header toe als extra bescherming. |
| 10 | **Open (niet-beveiligde) cadeaulijst toont IBAN aan iedereen met de link** — by design, maar de bankrekening is voor iedereen met de (zelfgekozen, soms raadbare) slug zichtbaar. | **Laag** | **Laag** | Overweeg IBAN standaard achter het wachtwoordslot te zetten, of de gebruiker hier expliciet op te wijzen. |

## Wat al goed is (geen actie nodig)

- **Geheimen veilig**: service-role-sleutel, Resend- en Gemini-API-sleutels staan alleen
  server-side (`lib/supabase/admin.ts` met `server-only`); alleen placeholders in
  `.env.example`. Geen geheimen in git.
- **Tokens sterk**: RSVP- en uitnodigingstokens zijn 128-bit willekeurig en niet te raden;
  uitnodigingen verlopen na 14 dagen en zijn eenmalig.
- **Gegevensisolatie**: RSVP-pagina toont alleen de eigen gegevens van de gast, niet de
  gastenlijst of adressen; `submit_rsvp` kan alleen het eigen record wijzigen.
- **Uitnodigingslek eerder gedicht**: `0016_fix_invite_email_binding.sql` koppelt een
  uitnodiging aan het juiste e-mailadres (voorkwam account-overname).
- **Geen XSS**: nergens `dangerouslySetInnerHTML`/`innerHTML`; AI-antwoorden worden als
  platte tekst getoond.
- **Open redirect afgevangen**: `next`-parameter in auth-callbacks wordt gevalideerd.
- **Cron beveiligd**: `/api/cron/reminders` vereist `CRON_SECRET` (faalt veilig dicht).
- **Accountverwijdering** vraagt het wachtwoord opnieuw (praktische CSRF-bescherming).
- **Goede beveiligingsheaders**: HSTS, X-Frame-Options: DENY, X-Content-Type-Options.

## Aanbevolen volgorde van herstel

1. Bevinding **1** (open cadeaulijst-database) — grootste risico, buitenstaander zonder login.
2. Bevinding **2** (e-mail-misbruik via confirm) en **3** (open contribute-endpoint).
3. Bevindingen **4, 6, 7** (snelle, goedkope verbeteringen).
4. Bevindingen **5, 8, 9, 10** (verdieping / opruimen).
