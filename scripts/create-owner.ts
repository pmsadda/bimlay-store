import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

async function main() {
  const email = requiredEnv("BIMLAY_SETUP_EMAIL")
    .trim()
    .toLowerCase();

  const password = requiredEnv("BIMLAY_SETUP_PASSWORD");

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("Enter a valid admin email address.");
  }

  if (password.length < 12 || password.length > 128) {
    throw new Error("Password must contain 12 to 128 characters.");
  }

  const adapter = new PrismaPg({
    host: requiredEnv("PGHOST"),
    port: Number(requiredEnv("PGPORT")),
    user: requiredEnv("PGUSER"),
    password: requiredEnv("PGPASSWORD"),
    database: requiredEnv("PGDATABASE"),
    max: 1,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 1000,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const existingAdminCount = await prisma.adminUser.count();

    if (existingAdminCount > 0) {
      throw new Error(
        "An admin account already exists. No account was changed.",
      );
    }

    const passwordHash = await hashPassword(password);

    const owner = await prisma.adminUser.create({
      data: {
        name: "BIMLAY Owner",
        email,
        passwordHash,
        role: "OWNER",
      },
      select: {
        email: true,
        role: true,
      },
    });

    console.log("OWNER_CREATED_OK");
    console.log(`Email: ${owner.email}`);
    console.log(`Role: ${owner.role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Owner account creation failed.");
  }

  process.exitCode = 1;
});