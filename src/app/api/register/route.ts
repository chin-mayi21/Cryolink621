import { NextResponse } from "next/server";
import { isUserRole } from "@/lib/auth/role-entry";
import { registerUser } from "@/lib/auth/register-user";
import type { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const role =
    typeof body?.role === "string" && isUserRole(body.role) ? (body.role as UserRole) : null;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "Name, email, password, and role are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const user = await registerUser({ email, name, password, role });
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "UNKNOWN";
    if (message === "EMAIL_IN_USE") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (message === "NO_EXPEDITION") {
      return NextResponse.json(
        { error: "No expedition in database. Run npm run db:seed first." },
        { status: 503 }
      );
    }
    if (message === "FAMILY_CONTACT_NOT_FOUND") {
      return NextResponse.json(
        {
          error: "Ask HQ to register your email as a family contact before creating a Family portal account.",
        },
        { status: 404 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Could not create account. Try again or use demo login after npm run db:seed." }, { status: 500 });
  }
}
