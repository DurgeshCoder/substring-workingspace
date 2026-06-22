import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables.');
  }

  try {
    // MySQL/MariaDB URL format: mysql://user:password@host:port/database
    const url = new URL(databaseUrl);
    const adapter = new PrismaMariaDb({
      host: url.hostname || 'localhost',
      port: url.port ? parseInt(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.substring(1),
      allowPublicKeyRetrieval: true,
    });

    return new PrismaClient({ adapter });
  } catch (error) {
    console.error('Failed to initialize Prisma Client with MariaDB adapter:', error);
    throw error;
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
