import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-4 py-4">
        <Link href="/" className="shrink-0 font-sans-w7 text-xl font-bold tracking-tight text-brand">
          Campagnedashboard
        </Link>
      </div>
    </header>
  );
}
