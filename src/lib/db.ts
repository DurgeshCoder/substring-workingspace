import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getMariaDbConfig(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    
    // Extract query parameters
    const connectionLimitParam = url.searchParams.get('connection_limit') || url.searchParams.get('connectionLimit');
    const acquireTimeoutParam = url.searchParams.get('pool_timeout') || url.searchParams.get('acquireTimeout') || url.searchParams.get('acquire_timeout');
    const connectTimeoutParam = url.searchParams.get('connect_timeout') || url.searchParams.get('connectTimeout');
    const sslmodeParam = url.searchParams.get('sslmode') || url.searchParams.get('sslMode');
    const sslParam = url.searchParams.get('ssl');
    
    const config: any = {
      host: url.hostname || 'localhost',
      port: url.port ? parseInt(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.substring(1),
      allowPublicKeyRetrieval: true,
    };

    // Configure connection limit (default to 10)
    if (connectionLimitParam) {
      config.connectionLimit = parseInt(connectionLimitParam, 10);
    } else {
      config.connectionLimit = 10;
    }

    // Configure acquire timeout (default to 10000ms)
    if (acquireTimeoutParam) {
      config.acquireTimeout = parseInt(acquireTimeoutParam, 10);
    } else {
      config.acquireTimeout = 10000;
    }

    // Configure connect timeout (default to 10000ms to be robust)
    if (connectTimeoutParam) {
      config.connectTimeout = parseInt(connectTimeoutParam, 10);
    } else {
      config.connectTimeout = 10000;
    }

    // Determine SSL/TLS settings
    if (sslParam === 'true' || sslParam === '1') {
      config.ssl = true;
    } else if (sslParam === 'false' || sslParam === '0') {
      config.ssl = false;
    } else if (sslmodeParam && sslmodeParam.toLowerCase() !== 'disable') {
      config.ssl = true;
      if (sslmodeParam.toLowerCase() === 'prefer' || sslmodeParam.toLowerCase() === 'require') {
        config.ssl = {
          rejectUnauthorized: false
        };
      }
    }

    return config;
  } catch (error) {
    console.error('Failed to parse database URL:', error);
    throw error;
  }
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables.');
  }

  try {
    const config = getMariaDbConfig(databaseUrl);

    // Log configured properties (excluding password for security)
    console.log(`[Database Connection Info] Host: ${config.host}:${config.port}, DB: ${config.database}, User: ${config.user}, SSL: ${JSON.stringify(config.ssl)}, Limit: ${config.connectionLimit}, ConnectTimeout: ${config.connectTimeout}ms, AcquireTimeout: ${config.acquireTimeout}ms`);

    const adapter = new PrismaMariaDb(config, {
      onConnectionError: (err) => {
        console.error('Prisma MariaDB connection error:', err);
      }
    });

    return new PrismaClient({ 
      adapter,
      log: ['error', 'warn']
    });
  } catch (error) {
    console.error('Failed to initialize Prisma Client with MariaDB adapter:', error);
    throw error;
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

