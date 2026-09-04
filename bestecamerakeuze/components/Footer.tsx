export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-card">
      <div className="mx-auto max-w-[1600px] px-4 py-8 text-sm text-ink-muted">
        <p className="max-w-3xl leading-relaxed">
          Data komt live uit de Google Sheet (tabblad &quot;Campagnes&quot;) en wordt bij elk
          bezoek opnieuw opgehaald.
        </p>
      </div>
    </footer>
  );
}
