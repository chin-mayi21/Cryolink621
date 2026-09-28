import { NextResponse } from "next/server";
import { z } from "zod";
import { isSessionUser, requireHqOfficial } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  destination: z.string().min(2).optional(),
  objectives: z.string().min(2).optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
  season: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireHqOfficial();
  if (!isSessionUser(session)) return session;

  const { id } = await params;
  if (!session.expeditionIds.includes(id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.plannedStart) data.plannedStart = new Date(parsed.data.plannedStart);
  if (parsed.data.plannedEnd) data.plannedEnd = new Date(parsed.data.plannedEnd);

  const updated = await prisma.expedition.update({
    where: { id },
    data,
  });

  await prisma.auditEvent.create({
    data: {
      actorUserId: session.id,
      expeditionId: id,
      entityType: "Expedition",
      entityId: id,
      action: "UPDATE",
      newState: JSON.stringify(parsed.data),
    },
  });

  return NextResponse.json({ expedition: updated });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireHqOfficial();
  if (!isSessionUser(session)) return session;

  const { id } = await params;
  if (!session.expeditionIds.includes(id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expedition = await prisma.expedition.findUnique({
    where: { id },
    include: {
      stations: true,
      teams: { include: { station: true } },
      personnel: { include: { team: true } },
      missions: { include: { team: true, personnel: true } },
      cargoItems: { take: 5, orderBy: { updatedAt: "desc" } },
      assets: true,
      inventoryNeeds: { orderBy: { createdAt: "asc" } },
      readinessItems: true,
    },
  });

  if (!expedition) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ expedition });
}
