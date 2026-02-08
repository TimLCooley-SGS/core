import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sgscore/ui", "@sgscore/api", "@sgscore/types"],
};

export default nextConfig;
