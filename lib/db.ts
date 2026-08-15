import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton: without this, hot-reloading would
// create a fresh PrismaClient (and a fresh connection pool) on every file
// save, eventually exhausting SQLite/Postgres connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
