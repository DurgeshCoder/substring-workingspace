import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export function getMariaDbConfig(databaseUrl: string) {
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

    // Configure connection limit (prioritize environment variables, then query parameters, then default to 5)
    const connectionLimitEnv = process.env.DATABASE_POOL_LIMIT || process.env.DATABASE_CONNECTION_LIMIT;
    if (connectionLimitEnv) {
      config.connectionLimit = parseInt(connectionLimitEnv, 10);
    } else if (connectionLimitParam) {
      config.connectionLimit = parseInt(connectionLimitParam, 10);
    } else {
      config.connectionLimit = 5;
    }

    // Configure acquire timeout (prioritize environment variables, then query parameters, then default to 20000ms)
    const acquireTimeoutEnv = process.env.DATABASE_POOL_TIMEOUT || process.env.DATABASE_ACQUIRE_TIMEOUT;
    if (acquireTimeoutEnv) {
      config.acquireTimeout = parseInt(acquireTimeoutEnv, 10);
    } else if (acquireTimeoutParam) {
      config.acquireTimeout = parseInt(acquireTimeoutParam, 10);
    } else {
      config.acquireTimeout = 20000;
    }

    // Configure connect timeout (prioritize environment variables, then query parameters, then default to 15000ms)
    const connectTimeoutEnv = process.env.DATABASE_CONNECT_TIMEOUT;
    if (connectTimeoutEnv) {
      config.connectTimeout = parseInt(connectTimeoutEnv, 10);
    } else if (connectTimeoutParam) {
      config.connectTimeout = parseInt(connectTimeoutParam, 10);
    } else {
      config.connectTimeout = 15000;
    }

    // Determine SSL/TLS settings
    const hasSsl = sslParam === 'true' || sslParam === '1' || (sslmodeParam && sslmodeParam.toLowerCase() !== 'disable');
    const disableSsl = sslParam === 'false' || sslParam === '0' || (sslmodeParam && sslmodeParam.toLowerCase() === 'disable');

    if (hasSsl) {
      const caCert = process.env.DATABASE_CA_CERT || process.env.MYSQL_ATTR_SSL_CA;
      if (caCert) {
        config.ssl = {
          ca: caCert,
          rejectUnauthorized: true
        };
      } else {
        // Default to rejectUnauthorized: false to allow connection to managed/cloud databases
        // without certificate validation errors (very common in Serverless and hosting providers)
        config.ssl = {
          rejectUnauthorized: false
        };
      }
    } else if (disableSsl) {
      config.ssl = false;
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
        if (err && typeof err === 'object') {
          try {
            console.error('Prisma MariaDB error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
          } catch (jsonErr) {
            console.error('Failed to serialize connection error:', jsonErr);
          }
        }
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

// Always store the prisma instance in the global scope (in both development and production)
// to prevent hot-reloads and concurrent requests from instantiating duplicate client pools.
globalForPrisma.prisma = db;

