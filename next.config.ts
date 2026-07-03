import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep HEIC decode out of the main serverless bundle; loaded only on HEIC uploads.
  serverExternalPackages: ["heic-convert", "heic-decode", "libheif-js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
