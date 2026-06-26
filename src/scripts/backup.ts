import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in environment variables.');
}

function getMariaDbConfig(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname || 'localhost',
    port: url.port ? parseInt(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.substring(1),
    allowPublicKeyRetrieval: true,
  };
}

const config = getMariaDbConfig(databaseUrl);
const adapter = new PrismaMariaDb(config);
const prisma = new PrismaClient({ adapter });

async function backup() {
  console.log('Starting database backup...');
  
  try {
    const departments = await prisma.department.findMany();
    const users = await prisma.user.findMany();
    const tasks = await prisma.task.findMany();
    const comments = await prisma.comment.findMany();
    const notifications = await prisma.notification.findMany();
    const activityLogs = await prisma.activityLog.findMany();

    const backupData = {
      departments,
      users,
      tasks,
      comments,
      notifications,
      activityLogs,
      backedUpAt: new Date().toISOString()
    };

    const backupPath = path.join(process.cwd(), 'db_backup_before_attendance.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`Backup successfully created at: ${backupPath}`);
    console.log(`Summary of backed up records:
- Departments: ${departments.length}
- Users: ${users.length}
- Tasks: ${tasks.length}
- Comments: ${comments.length}
- Notifications: ${notifications.length}
- Activity Logs: ${activityLogs.length}`);
  } catch (error) {
    console.error('Error backing up database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backup();
