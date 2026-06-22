import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in environment variables.');
}

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

const config = getMariaDbConfig(databaseUrl);
const adapter = new PrismaMariaDb(config);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('Seeding database...');

  // Create default departments
  const deptEngineering = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: {
      name: 'Engineering',
      description: 'Software Engineering Department',
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { name: 'HR' },
    update: {},
    create: {
      name: 'HR',
      description: 'Human Resources Department',
    },
  });

  console.log('Departments created.');

  // Hashes for default passwords
  const adminPasswordHash = await bcrypt.hash('admin1234', 10);
  const employeePasswordHash = await bcrypt.hash('employee1234', 10);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ems.com' },
    update: {},
    create: {
      employeeCode: 'EMP-001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@ems.com',
      password: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      designation: 'CTO',
      joiningDate: new Date(),
      departmentId: deptEngineering.id,
      gender: 'Male',
      salary: 150000,
    },
  });

  console.log('Admin user seeded:', admin.email);

  // Employee user
  const employee = await prisma.user.upsert({
    where: { email: 'employee@ems.com' },
    update: {},
    create: {
      employeeCode: 'EMP-002',
      firstName: 'John',
      lastName: 'Doe',
      email: 'employee@ems.com',
      password: employeePasswordHash,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      designation: 'Software Engineer',
      joiningDate: new Date(),
      departmentId: deptEngineering.id,
      gender: 'Male',
      salary: 80000,
    },
  });

  console.log('Employee user seeded:', employee.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
