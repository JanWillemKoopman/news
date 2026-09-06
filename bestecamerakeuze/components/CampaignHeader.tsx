import type { Campagne } from "@/lib/sheet";
import StatusIndicator from "@/components/StatusIndicator";
import { getBrandLogo } from "@/components/brandLogos";

/** Kolomkop van één campagne: naam als primaire informatie, merk + status als metadata. */
export default function CampaignHeader({ campagne }: { campagne: Campagne }) {
  const BrandLogo = campagne.merk ? getBrandLogo(campagne.merk) : null;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="block min-w-0 truncate text-[15px] font-semibold text-ink">{campagne.naam}</span>
      <span className="flex min-w-0 items-center gap-1.5">
        {campagne.merk &&
          (BrandLogo ? (
            <BrandLogo role="img" aria-label={campagne.merk} className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
          ) : (
            <span className="min-w-0 truncate text-xs text-ink-faint">{campagne.merk}</span>
          ))}
        <StatusIndicator status={campagne.status} />
      </span>
    </div>
  );
}
