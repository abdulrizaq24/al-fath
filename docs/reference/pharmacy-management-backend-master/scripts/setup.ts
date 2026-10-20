import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const pharmacyName = process.env.PHARMACY_NAME;
  const adminName = process.env.ADMIN_NAME;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!pharmacyName || !adminName || !adminUsername || !adminPassword) {
    throw new Error("Initial setup variables are missing from .env");
  }

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Pharmacy administrator",
    },
  });

  await prisma.role.upsert({
    where: { name: "PHARMACIST" },
    update: {},
    create: {
      name: "PHARMACIST",
      description: "Pharmacist and cashier",
    },
  });

  const pharmacy = await prisma.pharmacy.create({
    data: {
      name: pharmacyName,
      country: "Sudan",
      currency: "SDG",
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.create({
    data: {
      pharmacyId: pharmacy.id,
      roleId: adminRole.id,
      name: adminName,
      username: adminUsername,
      passwordHash,
    },
  });

  console.log("Initial setup completed.");
  console.log(`Pharmacy: ${pharmacy.name}`);
  console.log(`Admin username: ${adminUsername}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
