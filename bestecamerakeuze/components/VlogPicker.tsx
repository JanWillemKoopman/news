"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AffiliateButton from "./AffiliateButton";
import type { Cell } from "@/lib/vlog-format";

/** Alleen de velden die de keuzehulp toont — de rest van Product hoeft de client niet in. */
export type PickCard = {
  id: string;
  title: string;
  brand: string;
  image_url: string | null;
  affiliate_url: string;
  rank: number;
  reason: string;
  chips: Cell[];
};

export type PickerOption = {
  slug: string;
  label: string;
  situation: string;
  decisive: string;
  pick: PickCard;
  alternative: PickCard;
};

type Props = { options: PickerOption[] };

const CHIP_TONE: Record<Cell["tone"], string> = {
  good: "bg-good-light text-good",
  bad: "bg-bad-light text-bad",
  neutral: "bg-page text-ink-muted",
  unknown: "bg-page text-ink-faint",
};

function Chips({ chips }: { chips: Cell[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <li
          key={`${chip.text}-${chip.srText ?? ""}`}
          className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${CHIP_TONE[chip.tone]}`}
        >
          {chip.srText && <span className="sr-only">{chip.srText}: </span>}
          {chip.text}
        </li>
      ))}
    </ul>
  );
}

function Recommendation({
  card,
  heading,
  primary,
}: {
  card: PickCard;
  heading: string;
  primary: boolean;
}) {
  return (
    <div
      className={`rounded-card border bg-card p-4 ${
        primary ? "border-brand shadow-sm" : "border-line"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          primary ? "text-brand" : "text-ink-faint"
        }`}
      >
        {heading}
      </p>

      <div className="mt-3 flex gap-4">
        <div className="relative h-20 w-20 shrink-0 sm:h-24 sm:w-24">
          {card.image_url && (
            <Image
              src={card.image_url}
              alt={card.title}
              fill
              sizes="96px"
              className="object-contain"
            />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {card.brand} · nummer {card.rank} in onze top 10
          </p>
          <h3 className="mt-0.5 text-base font-bold leading-snug">
            <Link href={`/camera/${card.id}`} className="text-ink hover:text-brand hover:underline">
              {card.title}
            </Link>
          </h3>
          <Chips chips={card.chips} />
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{card.reason}</p>

      {primary && (
        <AffiliateButton href={card.affiliate_url} className="mt-4 w-full">
          Bekijk de {card.title} bij Coolblue
        </AffiliateButton>
      )}
    </div>
  );
}

/**
 * De keuzehulp. Bewust géén filter: filteren geeft een lijst terug zonder uit te leggen
 * waarom die zo is, en juist die uitleg is wat een bezoeker nodig heeft om zelf een
 * beslissing te durven nemen. Daarom eerst "wat weegt in jouw situatie het zwaarst",
 * dan pas een toestel.
 *
 * Gebouwd op echte radio-inputs: daarmee werkt pijltjesbediening, voorlezen en
 * focusweergave zonder dat we ze zelf hoeven na te bouwen.
 */
export default function VlogPicker({ options }: Props) {
  const [activeSlug, setActiveSlug] = useState(options[0]?.slug ?? "");
  const active = options.find((option) => option.slug === activeSlug) ?? options[0];

  if (!active) return null;

  return (
    <div className="rounded-panel border border-line bg-card p-5 sm:p-7">
      <fieldset>
        <legend className="text-lg font-bold text-ink sm:text-xl">
          Wat voor vlogger ben jij?
        </legend>
        <p className="mt-1 text-sm text-ink-muted">
          Kies wat het dichtst bij jouw situatie komt. Je krijgt niet alleen een camera te
          zien, maar ook waaróm die in jouw geval de beste is.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {options.map((option) => (
            <label key={option.slug} className="cursor-pointer">
              <input
                type="radio"
                name="vlogprofiel"
                value={option.slug}
                checked={option.slug === activeSlug}
                onChange={() => setActiveSlug(option.slug)}
                className="peer sr-only"
              />
              <span
                className="block rounded-card border border-line bg-page px-4 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-brand hover:text-brand peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cta"
              >
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* aria-live zodat schermlezers de wisseling meekrijgen zonder focus te verplaatsen. */}
      <div className="mt-6 border-t border-line pt-6" aria-live="polite">
        <p className="text-sm leading-relaxed text-ink-muted">{active.situation}</p>

        <div className="mt-4 rounded-card bg-brand-light p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">
            Wat hier het zwaarst weegt
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{active.decisive}</p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Recommendation card={active.pick} heading="Onze aanbeveling" primary />
          <Recommendation card={active.alternative} heading="Sterk alternatief" primary={false} />
        </div>
      </div>
    </div>
  );
}
