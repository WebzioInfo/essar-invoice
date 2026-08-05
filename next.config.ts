import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 828, 1080, 1200, 1920, 2048, 3840],
  },
  serverExternalPackages: ["@prisma/client", "tesseract.js", "tesseract.js-core", "pdf-parse"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@headlessui/react", "@heroicons/react"],
  },
};

export default nextConfig;

