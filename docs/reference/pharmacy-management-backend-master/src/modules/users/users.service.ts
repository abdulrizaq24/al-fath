import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";

export async function createPharmacist(
  pharmacyId: string,
  name: string,
  username: string,
  password: string,
) {
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new Error("Username already exists");
  }

  const pharmacistRole = await prisma.role.findUnique({
    where: {
      name: "PHARMACIST",
    },
  });

  if (!pharmacistRole) {
    throw new Error("Pharmacist role not found");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      pharmacyId,
      roleId: pharmacistRole.id,
      name,
      username,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      username: true,
      isActive: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });
}
