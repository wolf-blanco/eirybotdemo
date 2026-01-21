import type { NextConfig } from "next";

// Forced update trigger for Vercel

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
