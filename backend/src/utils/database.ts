import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { logger } from "./logger";

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "stdout",
        level: "error",
      },
      {
        emit: "stdout",
        level: "info",
      },
      {
        emit: "stdout",
        level: "warn",
      },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// Log queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e: Prisma.QueryEvent) => {
    logger.debug("Query: " + e.query);
    logger.debug("Params: " + e.params);
    logger.debug("Duration: " + e.duration + "ms");
  });
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully");
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info("✅ Database disconnected successfully");
  } catch (error) {
    logger.error("❌ Database disconnection failed:", error);
    throw error;
  }
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await disconnectDatabase();
});
