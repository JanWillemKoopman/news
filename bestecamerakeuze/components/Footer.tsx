export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-ink-muted">
        {/* Affiliate-transparantie is in Nederland verplicht onder de Wet oneerlijke
            handelspraktijken: de bezoeker moet weten dat links commissie opleveren. */}
        <p className="mb-3 font-semibold text-ink">Over deze site</p>
        <p className="max-w-3xl leading-relaxed">
          bestecamerakeuze.nl vergelijkt fotocamera&apos;s en verwijst door naar webwinkels.
          Wij ontvangen een commissie wanneer je via onze links iets koopt. Dat kost jou
          niets extra en beïnvloedt onze beoordelingen niet. Prijzen en voorraad kunnen
          afwijken; de prijs bij de winkel op het moment van bestellen is leidend.
        </p>
        <p className="mt-4 text-xs text-ink-faint">
          © {new Date().getFullYear()} bestecamerakeuze.nl — demo-omgeving
        </p>
      </div>
    </footer>
  );
}
