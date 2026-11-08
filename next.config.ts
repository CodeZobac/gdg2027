import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load tracing from node_modules so instrumentation and routes share one @opentelemetry/api
  // (bundling can swap in Next's older compiled copy, which ignores our context manager and splits traces).
  serverExternalPackages: ["@langfuse/tracing", "@langfuse/otel", "@langfuse/client", "@langfuse/core", "@opentelemetry/api", "@opentelemetry/sdk-trace-node", "@opentelemetry/context-async-hooks"],
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
