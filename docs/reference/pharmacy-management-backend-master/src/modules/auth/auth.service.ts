import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}
export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      role: true,
      pharmacy: true,
    },
  });

  if (!user || !user.isActive) {
    throw new Error("Invalid username or password");
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    throw new Error("Invalid username or password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
    },
  });

  const token = jwt.sign(
    {
      userId: user.id,
      pharmacyId: user.pharmacyId,
      role: user.role.name,
    },
    JWT_SECRET,
    {
      expiresIn: "8h",
    },
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role.name,
      pharmacyId: user.pharmacyId,
      pharmacyName: user.pharmacy.name,
    },
  };
}
