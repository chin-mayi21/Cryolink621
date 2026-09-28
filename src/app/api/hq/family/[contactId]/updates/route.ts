import { NextResponse } from "next/server";
import { z } from "zod";
import { isSessionUser, requireHqOfficial } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const updateSchema = z.object({
  message: z.string().trim().min(3).max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await requireHqOfficial();
  if (!isSessionUser(session)) return session;

  const { contactId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a family-safe update." }, { status: 400 });
  }

  const contact = await prisma.familyContact.findUnique({
    where: { id: contactId },
    include: { personnel: { select: { expeditionId: true } } },
  });
  if (!contact || !session.expeditionIds.includes(contact.personnel.expeditionId)) {
    return NextResponse.json({ error: "Family contact is outside your expedition scope." }, { status: 403 });
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
        newState: JSON.stringify({ familyContactId: contact.id }),
      },
    });
    return created;
  });

  return NextResponse.json({ update }, { status: 201 });
}