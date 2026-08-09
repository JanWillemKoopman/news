import Link from "next/link";
import {
  type Cell,
  batteryCell,
  logProfilesCell,
  recordingLimitCell,
  riskCell,
  stabilisationCell,
  textCell,
  weightCell,
  yesCell,
} from "@/lib/vlog-format";
import type { Product } from "@/lib/types";

type Props = { products: Product[] };

const TONE_CLASS: Record<Cell["tone"], string> = {
  good: "text-good font-semibold",
  bad: "text-bad font-semibold",
  neutral: "text-ink",
  unknown: "text-ink-faint",
};

/** Kolommen in de volgorde waarin ze voor vloggen zwaar wegen. */
const COLUMNS: { label: string; short: string; value: (product: Product) => Cell }[] = [
  // Eerst de vier ja/nee-kolommen: die scan je verticaal in één veeg. De toelichtende
  // tekstkolommen staan daarachter, zodat lange waarden de scanbaarheid niet breken.
  { label: "Klapscherm", short: "Klapscherm", value: (p) => yesCell(p.flip_screen) },
  { label: "Beeldstabilisatie", short: "Stabilisatie", value: stabilisationCell },
  { label: "Microfoon-ingang", short: "Mic-in", value: (p) => yesCell(p.mic_input) },
  { label: "Koptelefoon", short: "Koptelefoon", value: (p) => yesCell(p.headphone_out) },
  { label: "Max. opnameduur", short: "Max. clip", value: recordingLimitCell },
  { label: "Oververhitting", short: "Oververhitting", value: (p) => riskCell(p.overheating_reported) },
  { label: "Gewicht (incl. accu)", short: "Gewicht", value: weightCell },
  { label: "Accuduur video", short: "Accu video", value: batteryCell },
  { label: "Schermtype", short: "Schermtype", value: (p) => textCell(p.screen_type) },
  { label: "Autofocus", short: "Autofocus", value: (p) => textCell(p.autofocus_type) },
  { label: "Log- en kleurprofielen", short: "Log-profielen", value: logProfilesCell },
];

function CellText({ cell }: { cell: Cell }) {
  return (
    <span className={TONE_CLASS[cell.tone]}>
      {cell.text}
      {cell.srText && <span className="sr-only"> — {cell.srText}</span>}
    </span>
  );
}

/**
 * Camera's als rijen en eigenschappen als kolommen: zo lees je in één verticale veeg af
 * welke modellen een microfooningang missen, wat de vraag is waarmee de meeste mensen
 * hier komen.
 *
 * De tabel is breder dan een telefoonscherm en scrollt daarom in zijn eigen container;
 * de eerste kolom blijft staan zodat je nooit kwijtraakt naar welke camera je kijkt.
 */
export default function VlogCompareTable({ products }: Props) {
  return (
    /* `relative` is hier geen opmaak maar een bugfix: de sr-only-teksten in de cellen zijn
       absoluut gepositioneerd, en zonder positioned ancestor is hun containing block het
       document. Ze ontsnappen dan aan deze scroller en laten de héle pagina horizontaal
       meescrollen op mobiel — precies wat niet mag. */
    <div className="relative overflow-x-auto rounded-panel border border-line bg-card">
      <table className="w-full min-w-[1240px] border-collapse text-sm">
        <caption className="sr-only">
          Vlog-eigenschappen van de tien camera&apos;s uit deze top 10, in volgorde van de lijst
        </caption>
        <thead>
          <tr className="bg-brand text-white">
            <th
              scope="col"
              className="sticky left-0 z-10 w-[220px] min-w-[220px] bg-brand px-4 py-3 text-left font-semibold"
            >
              Camera
            </th>
            {COLUMNS.map((column) => (
              <th
                key={column.label}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left font-semibold"
              >
                <abbr title={column.label} className="no-underline">
                  {column.short}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {products.map((product, index) => (
            <tr key={product.id} className={index % 2 === 1 ? "bg-page/70" : undefined}>
              <th
                scope="row"
                // border-r markeert waar de vaste kolom ophoudt zodra je zijwaarts scrollt.
                className={`sticky left-0 z-10 w-[220px] min-w-[220px] border-b border-r border-line px-4 py-3 text-left align-top font-semibold ${
                  index % 2 === 1 ? "bg-page" : "bg-card"
                }`}
              >
                <span className="mr-1.5 text-ink-faint tabular-nums">{index + 1}.</span>
                <Link href={`/camera/${product.id}`} className="text-ink hover:text-brand hover:underline">
                  {product.title}
                </Link>
              </th>

              {COLUMNS.map((column) => (
                <td key={column.label} className="border-b border-line px-4 py-3 align-top">
                  <CellText cell={column.value(product)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
