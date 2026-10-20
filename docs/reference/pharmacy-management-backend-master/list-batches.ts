import { prisma } from "./src/config/prisma.js";

const batches = await prisma.batch.findMany({
  select: {
    id: true,
    medicineId: true,
    pharmacyId: true,
    batchNumber: true,
    currentQuantity: true,
  },
});

console.log(JSON.stringify(batches, null, 2));

await prisma.$disconnect();
