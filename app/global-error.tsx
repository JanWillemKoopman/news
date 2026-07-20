"use client";

// Laatste vangnet: vangt fouten in de root-layout zelf, waar app/error.tsx niet meer
// kan renderen. Moet zijn eigen <html>/<body> leveren en kan niet op globals.css
// rekenen, dus bewust simpele inline styling.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="nl">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 18 }}>Er ging onverwacht iets mis</h1>
          <p style={{ fontSize: 14, color: "#666" }}>
            Je gegevens staan veilig opgeslagen. Probeer het opnieuw of ververs de pagina.
          </p>
          <button
            onClick={reset}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
          >
            Opnieuw proberen
          </button>
          {error.digest && <p style={{ fontSize: 12, color: "#999" }}>Foutcode: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
