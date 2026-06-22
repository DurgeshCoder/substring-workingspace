import React from 'react';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import EmployeeTasksClient from './tasks-client';

export const dynamic = 'force-dynamic';

export default async function EmployeeTasksPage() {
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

  const admins = await db.user.findMany({
    where: {
      role: 'ADMIN',
      status: 'ACTIVE',
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

  return <EmployeeTasksClient initialTasks={serializedTasks as any} currentUser={session.user} admins={admins} />;
}
