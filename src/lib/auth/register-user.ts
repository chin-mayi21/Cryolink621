import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type RegisterInput = {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  googleId?: string;
};

export async function registerUser(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("EMAIL_IN_USE");
  }

  const expedition = await prisma.expedition.findFirst({ orderBy: { createdAt: "asc" } });
  if (!expedition) {
    throw new Error("NO_EXPEDITION");
  }

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, 10)
    : await bcrypt.hash(`${Date.now()}-${Math.random()}`, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash,
        role: input.role,
        ...(input.googleId ? { googleId: input.googleId } : {}),
      },
    });

    if (input.role === "OPERATIONS_OFFICIAL") {
      await tx.userExpeditionScope.create({
        data: { userId: user.id, expeditionId: expedition.id },
      });
    }

    if (input.role === "FIELD_PERSONNEL") {
      const team = await tx.team.findFirst({
        where: { expeditionId: expedition.id },
        orderBy: { name: "asc" },
      });
      const suffix = user.id.slice(-6).toUpperCase();
      const personnel = await tx.personnel.create({
        data: {
          expeditionId: expedition.id,
          teamId: team?.id,
          employeeCode: `REG-${suffix}`,
          fullName: input.name.trim(),
          roleTitle: "Expedition personnel",
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { personnelId: personnel.id },
      });
    }

    if (input.role === "FAMILY_NOK") {
      const contact = await tx.familyContact.findUnique({ where: { email } });
      if (!contact) throw new Error("FAMILY_CONTACT_NOT_FOUND");
      await tx.user.update({
        where: { id: user.id },
        data: { nextOfKinForId: contact.personnelId },
      });
    }

    return user;
  });
}
