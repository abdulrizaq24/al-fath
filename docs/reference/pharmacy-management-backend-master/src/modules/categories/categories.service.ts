import { prisma } from "../../config/prisma.js";

export async function createCategory(
  pharmacyId: string,
  name: string,
  description?: string,
) {
  const existingCategory = await prisma.category.findUnique({
    where: {
      pharmacyId_name: {
        pharmacyId,
        name,
      },
    },
  });

  if (existingCategory) {
    throw new Error("Category already exists");
  }

  const data = {
    pharmacyId,
    name,
    ...(description !== undefined && { description }),
  };

  return prisma.category.create({
    data,
  });
}
export async function getCategories(pharmacyId: string) {
  return prisma.category.findMany({
    where: {
      pharmacyId,
    },
    orderBy: {
      name: "asc",
    },
  });
}
