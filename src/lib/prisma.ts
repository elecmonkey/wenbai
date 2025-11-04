import { PrismaClient as EdgePrismaClient } from '@prisma/client/edge';
import type { PrismaClient as BasePrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const datasourceUrl = process.env.DATABASE_URL;
if (!datasourceUrl) {
  throw new Error('DATABASE_URL is not set. Prisma Accelerate requires a connection URL.');
}

function createPrismaClient() {
  return new EdgePrismaClient({
    datasourceUrl,
  }).$extends(withAccelerate());
}

type AcceleratedPrisma = ReturnType<typeof createPrismaClient>;

type GlobalWithPrisma = typeof globalThis & {
  prisma?: AcceleratedPrisma;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

const acceleratedClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = acceleratedClient;
}

export const prisma = acceleratedClient as unknown as BasePrismaClient;
