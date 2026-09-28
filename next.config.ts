import type { NextConfig } from "next";

// Fix Render/Vercel auth redirects before any server code runs
if (process.env.RENDER_EXTERNAL_URL) {
  const external = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  const auth = process.env.AUTH_URL ?? "";
  if (!auth || auth.includes("localhost")) {
    process.env.AUTH_URL = external;
    process.env.NEXTAUTH_URL = external;
  }
} else if (process.env.VERCEL_URL) {
  const external = `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  if (!process.env.AUTH_URL) {
    process.env.AUTH_URL = external;
    process.env.NEXTAUTH_URL = external;
  }
}

const googleOn = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: googleOn ? "true" : "false",
  },
};

export default nextConfig;
