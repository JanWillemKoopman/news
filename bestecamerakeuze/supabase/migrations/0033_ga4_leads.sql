-- De leads van udenhout.nl: GA4-events met "lead" in de naam, de laatste dertig dagen.
--
-- WAAROM DIT BESTAAT
-- Het tabblad Leads onder Kanalen wil weten hoeveel leads (offerte-, proefrit-, private
-- lease-aanvragen …) er binnenkwamen, voor welk merk en model, via welk kanaal — en wat de
-- betaalde campagnes daarvoor kostten. De bestaande GA4-tabellen kunnen dat niet: die
-- kennen geen merk of model, en `windsor_ga4_events` kent geen bron/medium of campagne.
-- Merk, model en formulier zijn event-parameters (custom dimensions) die alleen bij de
-- opvraging van de lead-events zelf mee te halen zijn.
--
-- WAAROM ZO KLEIN
-- Op verzoek zo compact mogelijk, en dat is hier vooral een kwestie van wat er NIET in
-- staat:
--
--   * Alleen dertig dagen. De tabel is een rollend venster, geen archief: de sync vervangt
--     de hele inhoud elke nacht (delete + insert in één transactie). Er is dus ook geen
--     opruimjob die kan vergeten te draaien — de tabel kan niet groeien.
--   * Alleen lead-events, van alleen de property van udenhout.nl. Het filter gaat mee naar
--     Windsor; wat geen lead is komt niet eens over de lijn.
--   * Geen uitgaven. Die staan al per campagne en dag in `windsor_advertenties` en worden
--     bij het lezen aan de leads gekoppeld (`v_leads_uitgaven`). Een tweede kopie zou
--     alleen een tweede waarheid zijn die uit de pas kan lopen.
--   * Geen account, website, kanaalgroep of inleestijdstip: de property is er één, het
--     kanaal volgt uit bron/medium (zie lib/leads/kanaal.ts) en het tijdstip staat in
--     sync_runs.
--   * Geen primary key en geen index. Elke query leest de hele tabel (±1.100 rijen,
--     ±135 kB); een index zou hem alleen verdubbelen zonder dat een query hem gebruikt.
--     Dubbele sleutels voorkomt de code: `leadRijenUitWindsor` telt ze op vóór het
--     schrijven.
--   * `aantal` is een smallint; de grootste rij in de meting was 15.
--
-- Lege waarden zijn lege strings en geen NULL, net als bij de andere GA4-tabellen: "(not
-- set)" en leeg zijn dezelfde toestand. Een sjabloonwaarde als `model_titel` (een
-- formulier dat de naam van het veld meestuurt in plaats van het model) is hier al een
-- lege string geworden — zie lib/leads/normaliseer.ts.
create table if not exists dataloket.windsor_ga4_leads (
  datum       date     not null,
  event       text     not null,                -- bv. generate_lead_proefrit
  bron_medium text     not null default '',     -- session_source_medium, bv. "google / cpc"
  campagne    text     not null default '',     -- de utm-/Ads-campagne van de sessie
  merk        text     not null default '',     -- event-parameter car_brand
  model       text     not null default '',     -- event-parameter car_model
  formulier   text     not null default '',     -- event-parameter form_location
  aantal      smallint not null check (aantal > 0)
);

comment on table dataloket.windsor_ga4_leads is
  'Lead-events (naam bevat "lead") van udenhout.nl uit GA4, de laatste 30 dagen: per dag, event, bron/medium, campagne, merk, model en formulier. Rollend venster: de sync vervangt de hele tabel elke nacht.';

-- Alleen de eigenaar (de sync) en de leesrol via de view hieronder. RLS staat aan zonder
-- policies: de view draait met de rechten van zijn eigenaar, dus de app leest gewoon,
-- maar niemand kan deze tabel rechtstreeks benaderen via de API van Supabase.
alter table dataloket.windsor_ga4_leads enable row level security;

create or replace view dataloket.v_ga4_leads as
select datum, event, bron_medium, campagne, merk, model, formulier, aantal
  from dataloket.windsor_ga4_leads;

comment on view dataloket.v_ga4_leads is
  'Lead-events van udenhout.nl uit GA4, laatste 30 dagen. aantal = aantal keren dat het event vuurde. Lege merk/model/formulier = het formulier stuurt die parameter niet mee.';

grant select on dataloket.v_ga4_leads to dataloket_lezer;

-- De uitgaven waar de leads aan gekoppeld worden: een dunne doorkijk op de feitentabel,
-- zonder de joins van v_advertenties (campagnemanager, thumbnails) die hier niets doen.
-- Geen eigen opslag. Het account staat erin zodat de app op het juiste account filtert
-- (Google "Udenhout", Meta "Van den Udenhout" — zie lib/leads/bereik.ts).
create or replace view dataloket.v_leads_uitgaven as
select datum, bron, account_id, campagne, uitgaven, klikken, vertoningen
  from dataloket.windsor_advertenties;

comment on view dataloket.v_leads_uitgaven is
  'Uitgaven, klikken en vertoningen per dag, bron, account en campagne — de kostenkant van het tabblad Leads. Dunne doorkijk op windsor_advertenties.';

grant select on dataloket.v_leads_uitgaven to dataloket_lezer;
