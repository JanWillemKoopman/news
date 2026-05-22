/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // De homepagina is de bruiloftplanner.
    return [{ source: '/', destination: '/bruiloft', permanent: false }]
  },
};

export default nextConfig;
