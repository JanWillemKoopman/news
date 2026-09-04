import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-brand">
      <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-4 py-3.5">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-white">
          Campagnedashboard
        </Link>
      </div>
    </header>
  );
}
