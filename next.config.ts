import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server (.next/standalone) so the Docker runtime image
  // only needs Node + the traced dependencies — no full node_modules copy.
  output: "standalone",
};

export default nextConfig;
