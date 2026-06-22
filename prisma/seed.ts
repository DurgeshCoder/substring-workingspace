import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in environment variables.');
}

const url = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: url.hostname || 'localhost',
  port: url.port ? parseInt(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.substring(1),
  allowPublicKeyRetrieval: true,
});

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
