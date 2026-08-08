type Props = {
  href: string;
  children: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
};

/**
 * De enige oranje knop op de pagina. `rel="sponsored"` is wat Google verlangt voor
 * betaalde links; nofollow en noopener staan erbij zodat we geen linkwaarde weggeven
 * en het doel geen toegang tot window.opener krijgt.
 */
export default function AffiliateButton({ href, children, size = "md", className = "" }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-card bg-cta font-bold text-white shadow-sm transition-colors hover:bg-cta-hover ${
        size === "lg" ? "px-7 py-3.5 text-lg" : "px-4 py-2.5 text-sm"
      } ${className}`}
    >
      {children}
      <span aria-hidden="true">&rarr;</span>
    </a>
  );
}
