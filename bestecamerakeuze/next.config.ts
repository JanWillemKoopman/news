import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Deze repo bevat meerdere projecten met een eigen lockfile; zonder dit kiest Next de
  // repo-root als workspace-root en trekt het de verkeerde bestanden in de bundel.
  outputFileTracingRoot: import.meta.dirname,
  images: {
    // Demo-afbeeldingen komen van placehold.co; zodra de echte Coolblue-feed
    // draait komen productfoto's van hun CDN en moet dat hier bij.
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "image.coolblue.nl" },
    ],
  },
};

export default nextConfig;
