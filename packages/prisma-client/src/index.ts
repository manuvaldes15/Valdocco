import { PrismaClient, Prisma } from '@prisma/client';

export * from '@prisma/client';
export { Prisma };

let prisma: PrismaClient | undefined;

/** Cliente Prisma singleton por proceso. */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    });
  }
  return prisma;
}
