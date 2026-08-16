import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default Server Action body limit is 1MB — too small for a player photo
  // upload on the Join form. See lib/actions/players.ts for the actual
  // per-file size check (this just has to be big enough to let a
  // within-limit file's multipart-encoded body through).
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
