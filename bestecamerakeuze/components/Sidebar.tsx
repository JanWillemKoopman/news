import NavigationItem from "@/components/NavigationItem";
import {
  IconBook,
  IconChat,
  IconChevronUpDown,
  IconCoin,
  IconMegaphone,
  IconSettings,
} from "@/components/icons";

export type DashboardView = "campagnes" | "chat" | "kennis" | "kosten";

type Props = {
  actief: DashboardView;
  onNavigate: (view: DashboardView) => void;
  gebruikerEmail: string | null;
};

function initialenVoor(email: string | null): string {
  if (!email) return "U";
  const local = email.split("@")[0] ?? "";
  return (local.slice(0, 2) || "U").toUpperCase();
}

/** Toon alleen het lokale deel van het werkadres als naam; het domein staat al in "Udenhout" eronder. */
function naamVoor(email: string | null): string {
  if (!email) return "Gast";
  return email.split("@")[0] || email;
}

/** De donkere navigatieschil links: branding, hoofdnavigatie en gebruikersprofiel. */
export default function Sidebar({ actief, onNavigate, gebruikerEmail }: Props) {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col justify-between overflow-y-auto border-r border-sidebar-line bg-sidebar px-4 py-5">
      <div>
        <div className="flex items-center gap-2 px-2">
          <span className="font-sans-w7 text-[15px] font-bold tracking-[0.08em] text-sidebar-ink">
            UDENHOUT
          </span>
          <span
            aria-label="AI-aangedreven"
            title="AI-aangedreven"
            className="flex h-4 w-6 shrink-0 items-center justify-center rounded-[5px] border border-white/15 bg-white/10 text-[9px] font-bold tracking-wide text-sidebar-ink-muted"
          >
            AI
          </span>
        </div>

        <nav aria-label="Hoofdnavigatie" className="mt-6 flex flex-col gap-0.5">
          <NavigationItem
            icon={<IconMegaphone />}
            label="Campagnes"
            active={actief === "campagnes"}
            onClick={() => onNavigate("campagnes")}
          />
          <NavigationItem
            icon={<IconChat />}
            label="Vraag het je data"
            active={actief === "chat"}
            onClick={() => onNavigate("chat")}
          />
          <NavigationItem
            icon={<IconBook />}
            label="Kennisbank"
            active={actief === "kennis"}
            onClick={() => onNavigate("kennis")}
          />
          <NavigationItem
            icon={<IconCoin />}
            label="Kosten"
            active={actief === "kosten"}
            onClick={() => onNavigate("kosten")}
          />
        </nav>
      </div>

      <div className="flex flex-col gap-0.5 border-t border-sidebar-line pt-3">
        <NavigationItem icon={<IconSettings />} label="Instellingen" />
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left transition-colors duration-150 hover:bg-sidebar-hover"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-sidebar-ink">
            {initialenVoor(gebruikerEmail)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-sidebar-ink">
              {naamVoor(gebruikerEmail)}
            </span>
            <span className="block truncate text-xs text-sidebar-ink-muted">Udenhout</span>
          </span>
          <IconChevronUpDown className="h-4 w-4 shrink-0 text-sidebar-ink-muted" />
        </button>
      </div>
    </aside>
  );
}
