import { prisma } from "./src/config/prisma.js";

const batch = await prisma.batch.findFirst();

if (!batch) {
  console.log("NO BATCH FOUND");
} else {
  console.log("BATCH:", batch.id);
  console.log("MEDICINE ID:", batch.medicineId);

  const medicine = await prisma.medicine.findUnique({
    where: {
      id: batch.medicineId,
    },
  });

  console.log("MEDICINE:", medicine);
}

await prisma.$disconnect();
