import { prisma } from "./src/config/prisma.js";

const result = await prisma.batch.findUnique({
  where: {
    id: "b5c45f28-d867-4469-b587-4fd809afd4a",
  },
  include: {
    medicine: true,
  },
});

console.log(JSON.stringify(result, null, 2));

await prisma.$disconnect();
