import { NextResponse } from "next/server";
import { z } from "zod";
import { isSessionUser, requireFieldPersonnel } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const messageSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export async function GET() {
  const session = await requireFieldPersonnel();
  if (!isSessionUser(session)) return session;

  const contact = await prisma.familyContact.findUnique({
    where: { personnelId: session.personnelId! },
    include: {
      updates: {
        orderBy: { createdAt: "asc" },
        take: 100,
        include: { author: { select: { name: true, role: true } } },
      },
    },
  });

  return NextResponse.json({
    hasContact: Boolean(contact),
    updates: contact?.updates.map((update) => ({
      id: update.id,
      message: update.message,
      createdAt: update.createdAt.toISOString(),
      authorName: update.author.name,
      authorRole: update.author.role,
    })) ?? [],
  });
}

export async function POST(request: Request) {
  const session = await requireFieldPersonnel();
  if (!isSessionUser(session)) return session;

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a message." }, { status: 400 });
  }

  const contact = await prisma.familyContact.findUnique({
    where: { personnelId: session.personnelId! },
    include: { personnel: { select: { expeditionId: true } } },
  });
  if (!contact) {
    return NextResponse.json({ error: "Ask HQ to register a Family contact before sending an update." }, { status: 409 });
  }

  const update = await prisma.$transaction(async (tx) => {
    const created = await tx.familyUpdate.create({
      data: {
        familyContactId: contact.id,
        authorUserId: session.id,
        message: parsed.data.message,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorUserId: session.id,
        expeditionId: contact.personnel.expeditionId,
        entityType: "FamilyUpdate",
        entityId: created.id,
        action: "CREATE",
        newState: JSON.stringify({ familyContactId: contact.id, source: "FIELD_PERSONNEL" }),
      },
    });
    return created;
  });

  return NextResponse.json({ update: { id: update.id, message: update.message, createdAt: update.createdAt.toISOString() } }, { status: 201 });
}