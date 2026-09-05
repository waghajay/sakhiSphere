import { PrismaClient } from '@prisma/client';
import { env } from './env';

let prisma: PrismaClient;

export function initDatabase(): void {
  prisma = new PrismaClient({
    log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  
  console.log('✅ Prisma Client initialized');
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return prisma;
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  }
}