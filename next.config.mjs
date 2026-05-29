/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        // Supabase Storage: vervang <project-ref> met jullie eigen project-ID
        // te vinden in Supabase Dashboard → Settings → API → Project URL
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    // De homepagina is de bruiloftplanner.
    return [{ source: '/', destination: '/bruiloft', permanent: false }]
  },
};

export default nextConfig;
