/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: "loose",
  },
  transpilePackages: ["@reown/appkit"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '**',
      },
    ],
  },
};

module.exports = nextConfig;