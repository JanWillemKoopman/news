import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Deze repo bevat meerdere projecten met een eigen lockfile; zonder dit kiest Next de
  // repo-root als workspace-root en trekt het de verkeerde bestanden in de bundel.
  outputFileTracingRoot: import.meta.dirname,
  images: {
    // Productfoto's staan lokaal in public/products/ (zie lib/photo-credits.ts) en hebben
    // dus geen remotePattern nodig. image.coolblue.nl staat er alvast in voor zodra de
    // echte winkelfeed gekoppeld wordt en de beelden van hun CDN komen.
    remotePatterns: [{ protocol: "https", hostname: "image.coolblue.nl" }],
  },
};

export default nextConfig;
