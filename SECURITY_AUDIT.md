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

| # | Status | Locatie & Omschrijving | Impact | Inspanning | Oplossing |
|---|--------|------------------------|--------|------------|-----------|
| 1 | ✅ Opgelost | **Cadeaulijst-database staat open voor iedereen** — `supabase/migrations/0012_registry.sql` (regels 102–158). De tabellen `registry_reservations` en `registry_contributions` geven de anonieme rol vrij spel: toevoegen (`with check (true)`), en **reserveringen verwijderen** (`using (true)`). Omdat de publieke Supabase-sleutel in de browsercode zit, kan een buitenstaander dit rechtstreeks via de database-API doen — buiten de website om. Gevolg: alle cadeau-reserveringen kunnen gewist worden, en er kunnen onbeperkt nep-reserveringen/-bijdragen aangemaakt worden. | **Kritiek** | **Medium** | Vier open `anon`-policies verwijderd in `0022_security_fixes.sql`. Alle schrijfacties lopen nu uitsluitend via de bestaande `SECURITY DEFINER`-RPC's. |
| 2 | ✅ Opgelost | **"Bevestig bijdrage"-endpoint zonder inlog (e-mail-misbruik)** — `app/api/registry/contribute/confirm/route.ts`. Iedereen die een bijdrage-ID kent kon dit aanroepen, waarna een e-mail werd verstuurd vanaf het domein van het bruidspaar naar een willekeurig adres → bruikbaar als **spam-/phishingkanaal**. De ingebouwde limiet zat in het geheugen en werkte niet betrouwbaar op Vercel. | **Hoog** | **Medium** | Nieuw `confirmation_token` (128-bit willekeurig) wordt bij aanmaak aan de gast teruggegeven en vereist bij bevestiging. In-memory limiet vervangen door database-limiet. |
| 3 | ✅ Opgelost | **Bijdrage-endpoint zonder limiet/controles** — `app/api/registry/contribute/route.ts`. Geen snelheidslimiet, geen maximumbedrag, en geen controle of de cadeaulijst aanstaat. Onbeperkt aanmaken van bijdragen mogelijk. | **Medium** | **Laag** | Database-rate-limiting toegevoegd (10/uur per IP), maximumbedrag €10.000, controle op `is_enabled`. |
| 4 | ✅ Opgelost | **Snelheidslimieten in geheugen i.p.v. database** — `app/api/ai/budget/route.ts` en `app/api/ai/taken/route.ts`. Op Vercel draaien meerdere servers; een geheugenlimiet is daardoor makkelijk te omzeilen → mogelijk misbruik van de (betaalde) AI-dienst. | **Medium** | **Laag** | Vervangen door de bestaande database-limiet `checkRateLimit()` uit `lib/rateLimit.ts`. |
| 5 | ⚠️ Open | **Wachtwoordslot cadeaulijst is alleen client-side** — slot wordt onthouden in `sessionStorage`; te omzeilen via de browserconsole. Gevolg is beperkt: bankgegevens (IBAN) worden serverseitig wél afgeschermd, dus alleen de cadeaulijst wordt zichtbaar. | **Laag** | **Medium** | Lijst-inhoud serverseitig pas vrijgeven ná geslaagde wachtwoordcontrole (in de RPC/route die de items teruggeeft). |
| 6 | ✅ Opgelost | **Zwakke minimale wachtwoordlengte (6 tekens)** — `supabase/config.toml`. Maakt accounts kwetsbaarder voor raden/brute-force. | **Medium** | **Laag** | Verhoogd naar 10 tekens in `config.toml`. |
| 7 | ✅ Opgelost | **Opslag-buckets niet in migraties** — `avatars` en `registry-images` worden in de code gebruikt maar waren niet in migraties gedefinieerd; toegangsregels niet te controleren. | **Medium** | **Laag** | Beide buckets met correcte upload-/leespolicies gedefinieerd in `0022_security_fixes.sql`. |
| 8 | ✅ Opgelost | **Ongebruikte database-functie met zwakke vergelijking** — `check_registry_password` stond open voor `anon` en vergeleek platte tekst met een hash. | **Laag** | **Laag** | Functie verwijderd en rechten ingetrokken in `0022_security_fixes.sql`. |
| 9 | ✅ Opgelost | **Geen Content-Security-Policy (CSP)-header** — `next.config.mjs` had goede headers maar geen CSP. | **Laag** | **Medium** | CSP-header toegevoegd in `next.config.mjs` (beperkt externe script-/verbindingsoorsprong). |
| 10 | ⚠️ Open | **Open (niet-beveiligde) cadeaulijst toont IBAN aan iedereen met de link** — by design, maar de bankrekening is voor iedereen met de slug zichtbaar. | **Laag** | **Laag** | Overweeg IBAN standaard achter het wachtwoordslot te zetten, of de gebruiker hierover te informeren. |

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
