"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/projects");
    router.refresh();
  }

  async function onMagicLink() {
    if (!email) {
      setError("Vul eerst je e-mailadres in.");
      return;
    }
    setMagicBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMagicBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Check je mail</h1>
        <p className="mt-2 text-sm text-neutral-500">
          We hebben een inloglink gestuurd naar <span className="font-medium">{email}</span>. Klik
          erop om in te loggen.
        </p>
        <button
          onClick={() => setMagicSent(false)}
          className="mt-6 text-sm text-neutral-500 underline hover:text-neutral-800"
        >
          Terug
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">MMM Wizard</h1>
      <p className="mt-1 text-sm text-neutral-500">Log in om verder te gaan.</p>

      <form onSubmit={onPasswordSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Wachtwoord</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
        >
          {loading ? "Bezig…" : "Inloggen"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px grow bg-neutral-200" />
        of
        <span className="h-px grow bg-neutral-200" />
      </div>

      <button
        onClick={onMagicLink}
        disabled={magicBusy}
        className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {magicBusy ? "Versturen…" : "Stuur mij een magische inloglink"}
      </button>
      <p className="mt-2 text-xs text-neutral-400">
        Geen wachtwoord ingesteld? Gebruik de magische link — we mailen je een inloglink.
      </p>
    </main>
  );
}
