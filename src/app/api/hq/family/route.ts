import { NextResponse } from "next/server";
import { z } from "zod";
import { isSessionUser, requireHqOfficial } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const contactSchema = z.object({
  personnelId: z.string().min(1),
  fullName: z.string().trim().min(2).max(120),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  relationship: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).optional(),
});

export async function GET() {
  const session = await requireHqOfficial();
  if (!isSessionUser(session)) return session;

  const personnel = await prisma.personnel.findMany({
    where: { expeditionId: { in: session.expeditionIds } },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      employeeCode: true,
      expeditionId: true,
      expedition: { select: { name: true, code: true } },
      team: { select: { name: true } },
      nextOfKin: { select: { id: true, email: true } },
      familyContact: {
        include: { updates: { orderBy: { createdAt: "desc" }, take: 5 } },
      },
    },
  });

  return NextResponse.json({ personnel });
}

export async function POST(request: Request) {
  const session = await requireHqOfficial();
  if (!isSessionUser(session)) return session;

  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid contact details." }, { status: 400 });
  }

  const member = await prisma.personnel.findUnique({
    where: { id: parsed.data.personnelId },
    include: { nextOfKin: true, familyContact: true },
  });
  if (!member || !session.expeditionIds.includes(member.expeditionId)) {
    return NextResponse.json({ error: "Personnel record is outside your expedition scope." }, { status: 403 });
  }
  if (member.familyContact) {
    return NextResponse.json({ error: "A family contact is already registered for this person." }, { status: 409 });
  }
  if (member.nextOfKin && member.nextOfKin.email !== parsed.data.email) {
    return NextResponse.json({ error: "This person already has a linked Family / Next of Kin account with a different email." }, { status: 409 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser && (existingUser.role !== "FAMILY_NOK" || existingUser.nextOfKinForId !== member.id)) {
    return NextResponse.json({ error: "That email is already assigned to another account." }, { status: 409 });
  }

  const contact = await prisma.$transaction(async (tx) => {
    const created = await tx.familyContact.create({
      data: {
        personnelId: member.id,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        relationship: parsed.data.relationship,
        phone: parsed.data.phone || null,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: session.id,
        expeditionId: member.expeditionId,
        entityType: "FamilyContact",
        entityId: created.id,
        action: "CREATE",
        newState: JSON.stringify({ personnelId: member.id }),
      },
    });
    return created;
  });

  return NextResponse.json({ contact }, { status: 201 });
}