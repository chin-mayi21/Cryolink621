"use server";

import { signOut } from "@/auth";

/** Ends the session on the server so the HttpOnly auth cookie is reliably expired. */
export async function logout() {
  await signOut({ redirectTo: "/" });
}
