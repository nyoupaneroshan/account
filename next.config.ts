import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Use trailing slash to match Caddy proxy behavior
  // Caddy adds trailing slashes to directory-like URLs
  trailingSlash: true,
  allowedDevOrigins: [
    ".space-z.ai",
    "space-z.ai",
    "preview-chat-50fd366e-ab4c-43c7-a25b-5bf5da9a8130.space-z.ai",
  ],
};

export default nextConfig;
