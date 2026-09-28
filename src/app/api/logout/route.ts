import { NextResponse } from "next/server";

const authCookieNames = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.callback-url",
  "next-auth.callback-url",
];

/**
 * A transport-independent logout endpoint. Clearing all supported Auth.js names
 * makes logout reliable even if an earlier version created the current cookie.
 */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  for (const name of authCookieNames) {
    response.cookies.set({ name, value: "", path: "/", maxAge: 0, expires: new Date(0) });
  }
  return response;
}
