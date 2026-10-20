import "dotenv/config";
import { prisma } from "./src/config/prisma.js";

const result = await prisma.$queryRaw<
  Array<{
    database: string;
    username: string;
    serverAddress: string | null;
    serverPort: number;
  }>
>`
  SELECT
    current_database() AS database,
    current_user AS username,
    inet_server_addr()::text AS "serverAddress",
    inet_server_port() AS "serverPort"
`;

console.log(result);

const medicine = await prisma.medicine.findUnique({
  where: {
    id: "a485e9bd-b69e-423b-ae1f-1a29e88bfdbc",
  },
});

console.log("MEDICINE:");
console.log(medicine);

await prisma.$disconnect();
