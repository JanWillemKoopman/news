"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Inloggen met een magic link naar het werkadres.
 *
 * Er is bewust geen wachtwoord: dat scheelt beheer, en wie geen toegang meer heeft tot
 * zijn werkmail hoort ook geen toegang meer te hebben tot deze data. Wie er binnen mag,
 * regel je in Supabase (bijvoorbeeld door alleen adressen op het eigen domein toe te
 * laten); deze pagina doet daar geen uitspraak over.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"rust" | "bezig" | "verstuurd">("rust");
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("bezig");
    setFout(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setFout(error.message);
      setStatus("rust");
    } else {
      setStatus("verstuurd");
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-sans-w7 text-2xl font-bold text-ink">Inloggen</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Je krijgt een inloglink in je mailbox. Geen wachtwoord nodig.
      </p>

      {status === "verstuurd" ? (
        <div className="mt-6 rounded-panel border border-line bg-surface p-5">
          <p className="font-sans-w7 font-bold text-ink">Check je mail</p>
          <p className="mt-1.5 text-sm text-ink-muted">
            We hebben een inloglink gestuurd naar <strong>{email}</strong>. De link is
            een uur geldig.
          </p>
        </div>
      ) : (
        <form onSubmit={verstuur} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voornaam@udenhout.nl"
            className="rounded-pill border border-line bg-card px-5 py-3 text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "bezig"}
            className="rounded-pill bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {status === "bezig" ? "Versturen…" : "Stuur inloglink"}
          </button>
          {fout && <p className="text-sm text-orange">{fout}</p>}
        </form>
      )}
    </main>
  );
}
