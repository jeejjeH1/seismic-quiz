import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __sqPrisma?: PrismaClient };

export const prisma = globalForPrisma.__sqPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__sqPrisma = prisma;
