import { PrismaClient } from '@prisma/client';

/**
 * Singleton do Prisma Client para evitar múltiplas instâncias
 * durante hot-reload no desenvolvimento (Next.js).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

// Compatibilidade com imports antigos que esperam `prisma`
export const prisma = db;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
