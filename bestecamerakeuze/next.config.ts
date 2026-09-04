import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Deze repo bevat meerdere projecten met een eigen lockfile; zonder dit kiest Next de
  // repo-root als workspace-root en trekt het de verkeerde bestanden in de bundel.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
