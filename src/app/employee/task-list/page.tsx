import React from 'react';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import EmployeeTaskListClient from './task-list-client';

export const dynamic = 'force-dynamic';

export default async function EmployeeTaskListPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const tasks = await db.task.findMany({
    where: {
      assignedToId: session.user.id,
    },
    include: {
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

  // Serialize Date objects for Client Component hydration
  const serializedTasks = tasks.map(task => ({
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  }));

  return <EmployeeTaskListClient initialTasks={serializedTasks as any} />;
}
