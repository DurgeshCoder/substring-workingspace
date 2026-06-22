import React from 'react';
import { db } from '@/lib/db';
import TasksClient from './tasks-client';

export const dynamic = 'force-dynamic';

export default async function AdminTasksPage() {
  const tasks = await db.task.findMany({
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const employees = await db.user.findMany({
    where: {
      role: 'EMPLOYEE',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: {
      firstName: 'asc',
    },
  });

  // Serialize Date objects for Client Component hydration
  const serializedTasks = tasks.map(task => ({
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  }));

  return (
    <TasksClient 
      initialTasks={serializedTasks as any} 
      employees={employees} 
    />
  );
}
