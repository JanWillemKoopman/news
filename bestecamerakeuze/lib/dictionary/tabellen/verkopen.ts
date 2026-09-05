import type { TabelBeschrijving } from "@/lib/dictionary/types";

/**
 * VOORBEELDTABEL — nog niet jullie echte data.
 *
 * Dit bestand staat er zodat het hele systeem end-to-end werkt en zodat je ziet welke
 * vorm een tabelbeschrijving heeft. Zodra de echte verkoopsheet gekoppeld is, vervang
 * je de inhoud hieronder; er hoeft dan niets aan de chat, de guardrails of de UI te
 * veranderen.
 *
 * De velden die je met de meeste zorg invult zijn `regels` en `voorbeelden`. Daar zit
 * de kennis die het verschil maakt tussen een query die draait en een query die klopt.
 */
export const verkopen: TabelBeschrijving = {
  view: "v_verkopen",
  doel:
    "Alle verkochte voertuigen per orderregel. Gebruik deze tabel voor vragen over " +
    "aantallen verkocht, omzet, en verkoop per merk of periode.",
  granulariteit:
    "Eén rij = één orderregel. Let op: de kolom `aantal` kan groter zijn dan 1, " +
    "dus tel voertuigen met sum(aantal) en niet met count(*).",
  bron: "Google Sheet 'Verkoop', tabblad Orders",
  ververst: "elke nacht om 03:00",
  eigenaar: "verkoop binnendienst",

  kolommen: [
    {
      naam: "ordernummer",
      type: "text",
      betekenis: "Unieke sleutel van de orderregel. Ook gebruikt in andere systemen.",
    },
    {
      naam: "tekendatum",
      type: "date",
      betekenis:
        "Datum waarop de klant tekende. DIT is de verkoopdatum — gebruik deze kolom " +
        "voor alle vragen over 'wanneer verkocht'.",
    },
    {
      naam: "afleverdatum",
      type: "date",
      betekenis: "Datum van fysieke aflevering.",
      leegBetekent: "nog niet afgeleverd",
    },
    {
      naam: "merk",
      type: "text",
      betekenis: "Merk van het voertuig.",
      waarden: ["DAF", "Volvo", "Renault", "MAN", "overig"],
    },
    {
      naam: "status",
      type: "text",
      betekenis: "Status van de orderregel.",
      waarden: ["offerte", "definitief", "afgeleverd", "geannuleerd"],
    },
    {
      naam: "aantal",
      type: "int",
      betekenis: "Aantal voertuigen op deze orderregel.",
      eenheid: "stuks",
    },
    {
      naam: "orderbedrag",
      type: "numeric",
      betekenis: "Waarde van de orderregel.",
      eenheid: "euro, exclusief btw",
    },
  ],

  regels: [
    "'Verkocht' betekent status 'definitief' OF 'afgeleverd'. Offertes en annuleringen tellen nooit mee, tenzij er expliciet naar gevraagd wordt.",
    "Tel voertuigen altijd met sum(aantal), nooit met count(*).",
    "Voor 'wanneer verkocht' geldt de tekendatum. De afleverdatum kan maanden later liggen en is een andere vraag.",
    "Bedragen zijn exclusief btw.",
  ],

  synoniemen: {
    omzet: "orderbedrag",
    orderwaarde: "orderbedrag",
    verkocht: "status in ('definitief','afgeleverd')",
    truck: "elk voertuig in deze tabel",
    auto: "elk voertuig in deze tabel",
  },

  valkuilen: [
    "Een order met meerdere voertuigen staat als meerdere regels óf als één regel met aantal > 1 — beide komen voor.",
    "Geannuleerde orders blijven in de sheet staan; de view filtert ze niet weg omdat je er soms naar wilt kunnen vragen.",
  ],

  voorbeelden: [
    {
      vraag: "Hoeveel auto's van het merk DAF zijn verkocht in week 40 van 2025?",
      sql:
        "select sum(aantal) as aantal_verkocht\n" +
        "from v_verkopen\n" +
        "where merk = 'DAF'\n" +
        "  and status in ('definitief','afgeleverd')\n" +
        "  and tekendatum >= date '2025-09-29'\n" +
        "  and tekendatum <  date '2025-10-06'",
      toelichting:
        "Week 40 van 2025 loopt van maandag 29 september t/m zondag 5 oktober (ISO). " +
        "Gebruik een datumbereik in plaats van extract(week …): dat leest beter terug " +
        "en maakt de gehanteerde weekgrenzen zichtbaar in het antwoord.",
    },
    {
      vraag: "Wat was de omzet per merk vorig kwartaal?",
      sql:
        "select merk, sum(orderbedrag) as omzet, sum(aantal) as voertuigen\n" +
        "from v_verkopen\n" +
        "where status in ('definitief','afgeleverd')\n" +
        "  and tekendatum >= date_trunc('quarter', current_date) - interval '3 months'\n" +
        "  and tekendatum <  date_trunc('quarter', current_date)\n" +
        "group by merk\n" +
        "order by omzet desc",
    },
    {
      vraag: "Welke orders zijn wel getekend maar nog niet afgeleverd?",
      sql:
        "select ordernummer, merk, tekendatum, aantal\n" +
        "from v_verkopen\n" +
        "where status = 'definitief'\n" +
        "  and afleverdatum is null\n" +
        "order by tekendatum",
      toelichting:
        "Status 'afgeleverd' en een gevulde afleverdatum horen samen; 'definitief' " +
        "zonder afleverdatum is de openstaande orderportefeuille.",
    },
  ],
};
