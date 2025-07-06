import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['langchain', '@langchain/openai'],
  webpack: (config) => {
    config.externals = [...config.externals, 'canvas', 'jsdom'];
    return config;
  },
};

export default nextConfig;
