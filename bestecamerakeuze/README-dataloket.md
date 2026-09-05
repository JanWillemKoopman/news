# Het dataloket — aansluiten

Het chattabblad ("Vraag het je data") is gebouwd maar staat uit tot de omgeving is
aangesloten. Zolang dat niet zo is, blijft het campagne-tabblad gewoon werken en toont
het chattabblad welke variabelen nog ontbreken.

Onderstaande stappen zijn eenmalig.

## 1. Migraties draaien

Voer in volgorde uit in de Supabase SQL-editor:
`supabase/migrations/0001_dataloket.sql`, dan `0002_gesprekken.sql`, dan
`0003_kennisbank.sql`.

De eerste zet de datalaag en de read-only rol neer, de tweede de gespreksgeschiedenis
(gesprekken, berichten, feedback — elk met rijbeveiliging zodat iedereen alleen zijn
eigen gesprekken ziet), de derde de kennisbank.

Dat maakt het `dataloket`-schema aan met:

- `sync_runs` en `sync_afwijkingen` — wat is wanneer ingelezen, en welke rijen zijn afgekeurd
- `query_log` — elke vraag en elke uitgevoerde query, met RLS zodat iedereen alleen zijn eigen regels ziet
- `verkopen_raw` + `v_verkopen` — een **voorbeeldtabel** met zeven regels, zodat je de chat kunt uitproberen voordat de echte data er is
- de rol `dataloket_lezer` — de read-only rol waarop de chat draait

**Vervang `VERVANG_DIT_WACHTWOORD` in de migratie** voordat je hem draait.

## 2. De read-only verbinding pakken

Neem de connection string van Supabase (Project Settings → Database → Connection string →
**Transaction pooler**, poort 6543 — die is gemaakt voor serverless) en vervang gebruiker
en wachtwoord door `dataloket_lezer` en het wachtwoord uit stap 1.

Controleer dat de rol echt niet kan schrijven:

```sql
-- moet werken
select count(*) from v_verkopen;
-- moet falen met "permission denied"
delete from verkopen_raw;
```

Deze rol is de belangrijkste grens in het systeem. Gebruik hem nergens anders voor.

## 3. Omgevingsvariabelen zetten

In Vercel (of `.env.local` voor lokaal):

| Variabele | Waarvoor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | inloggen en het querylog |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | idem |
| `DATAQUERY_DATABASE_URL` | de read-only verbinding uit stap 2 |
| `ANTHROPIC_API_KEY` | de Claude API |
| `SYNC_DATABASE_URL` | schrijvende verbinding, alleen voor de sync-job |
| `CRON_SECRET` | beschermt `/api/sync` tegen aanroepen van buiten |

`DATAQUERY_DATABASE_URL` en `SYNC_DATABASE_URL` horen **verschillende** rollen te zijn.

## 4. Wie mag inloggen

Inloggen gaat via een magic link. Beperk in Supabase (Authentication → Providers → Email)
wie er binnenkomt, bijvoorbeeld door alleen adressen op het eigen domein toe te laten.

Standaard staat de inlog alleen vóór het chattabblad; het campagnedashboard blijft
publiek zoals het nu is. Wil je de héle app achter de inlog zetten, pas dan de `matcher`
in `middleware.ts` aan — dat staat als commentaar in het bestand.

## 5. De echte sheets koppelen

1. Zet per sheet een regel in `BRONNEN` in `lib/sync/bronnen.ts` (sheet-id, tabblad,
   doeltabel, sleutelkolom en de kolommapping).
2. Maak de bijbehorende tabel en `v_`-view aan in een nieuwe migratie.
3. Geef de view expliciet vrij: `grant select on dataloket.v_naam to dataloket_lezer;`
   Dat is bewust geen automatisme — een view die niemand heeft vrijgegeven, bestaat niet
   voor de chat.
4. Beschrijf de tabel in `lib/dictionary/tabellen/` en zet hem in de lijst in
   `lib/dictionary/index.ts`.

Stap 4 is het werk dat ertoe doet. Zie hieronder.

## Twee soorten kennis

Belangrijk onderscheid, want ze horen op verschillende plekken thuis:

| | Datawoordenboek | Kennisbank |
|---|---|---|
| Beschrijft | de **vorm** van de data: tabellen, kolommen, wat "verkocht" betekent | de **wereld** die de data beschrijft: welke campagnes bij elkaar horen, waarom een week afwijkt |
| Wijzigt | zelden | wekelijks |
| Staat in | code (`lib/dictionary/`) | de database, tabblad "Kennisbank" |
| Onderhouden door | wie bouwt | de marketeers zelf, zonder deploy |

De kennisbank wordt bij elke vraag aan de systeemprompt toegevoegd, **ná** het
cachebreekpunt. Dat is bewust: stond hij in het gecachete deel, dan zou elke wijziging
van een marketeer de cache van het hele woordenboek weggooien en elke vraag daarna
duurder maken.

Er zit een tekenplafond op (`PROMPT_BUDGET` in `lib/kennisbank.ts`). Bij overschrijding
vallen de oudste items weg en waarschuwt het tabblad daarover — beter een zichtbare
grens dan een chat die ongemerkt duurder en vager wordt.

## Het datawoordenboek

`lib/dictionary/` bevat de kennis die het model krijgt voordat het één query schrijft.
`tabellen/verkopen.ts` is het ingevulde voorbeeld.

De twee velden waar het echt om gaat:

- **`regels`** — de bedrijfsregels. Wat telt als "verkocht"? Welke statussen tellen mee?
  Zijn bedragen inclusief btw? Zijn er historische breuken? Dit staat nergens in de data
  en is precies wat het verschil maakt tussen een query die draait en een query die klopt.
- **`voorbeelden`** — echte vragen met de correcte SQL. Dit is de sterkste kwaliteitsknop
  die je hebt: één goed voorbeeld doet meer dan drie alinea's uitleg.

Ga na een paar weken door `query_log` heen op mislukte queries. Elke mislukking wijst op
kennis die nog niet in het woordenboek staat.

## Wat de chat kan

| Functie | Waar het zit |
|---|---|
| Gesprekken bewaren, hervatten, hernoemen, verwijderen, doorzoeken | `lib/gesprekken.ts`, `app/api/gesprekken/` |
| Automatische gesprekstitel na het eerste antwoord | `lib/vervolg.ts` (draait op Haiku) |
| Vervolgvragen voorgesteld na elk antwoord | idem |
| Grafieken: stat-tegel, staaf, lijn, donut, tabel | `components/chat/Visual.tsx` |
| Opmaak in antwoorden (koppen, lijsten, vet) | `components/chat/Markdown.tsx` |
| Kopiëren, opnieuw beantwoorden, stoppen tijdens het antwoord | `components/DataChat.tsx` |
| Exporteren naar CSV voor Excel | `lib/csv.ts` |
| "Klopt / klopt niet" per antwoord | `app/api/feedback/route.ts` |

### Feedback is je werklijst

De tabel `dataloket.feedback` is geen tevredenheidsmeting. Een antwoord dat als fout is
gemarkeerd wijst bijna altijd op iets wat nog niet in het datawoordenboek staat — een
definitie, een toegestane waarde, een valkuil. Loop die lijst periodiek langs:

```sql
select b.tekst, f.oordeel, f.aangemaakt_op
from dataloket.feedback f
join dataloket.berichten b on b.id = f.bericht_id
where f.oordeel = 'fout'
order by f.aangemaakt_op desc;
```

Hetzelfde geldt voor mislukte queries in `dataloket.query_log`.

## Testen

```bash
npm test        # de SQL-guard (regressietest op de veiligheidsgrens)
npm run typecheck
npm run build
```

## De sync draaien

`vercel.json` zet de nachtelijke cron op 02:00 UTC — dat is 03:00 Nederlandse wintertijd
en 04:00 zomertijd (Vercel-crons draaien altijd in UTC). Handmatig:

```bash
curl -X POST https://<jouw-app>/api/sync -H "Authorization: Bearer $CRON_SECRET"
```

## Grenzen die in de code vastliggen

Deze zitten in de infrastructuur, niet in de prompt — een taalmodel kan ze niet
wegpraten:

- de rol `dataloket_lezer` heeft alleen `SELECT` op de `v_`-views (migratie)
- elke query draait in een `BEGIN READ ONLY`-transactie met `statement_timeout` van 10s
  (`lib/dataQuery.ts`)
- `guardSql()` laat alleen één enkele `SELECT` door en plakt er een `LIMIT 1000` omheen
  (`lib/sqlGuard.ts`, getest in `lib/sqlGuard.test.ts`)
- het model mag maximaal 6 queries per vraag draaien (`app/api/chat/route.ts`)
