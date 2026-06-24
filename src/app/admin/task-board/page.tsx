import React from 'react';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AdminTaskBoardClient from './task-board-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ employeeId?: string }>;
}

export default async function AdminTaskBoardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // Ensure only admins can access this page
  if (session.user.role !== 'ADMIN') {
    redirect('/employee/dashboard');
  }

  // Fetch all active employees
  const employees = await db.user.findMany({
    where: {
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      designation: true,
      imageUrl: true,
    },
    orderBy: {
      firstName: 'asc',
    },
  });

  const { employeeId } = await searchParams;
  const targetEmployeeId = employeeId || null;

  let tasks: any[] = [];
  if (targetEmployeeId) {
    tasks = await db.task.findMany({
      where: {
        assignedToId: targetEmployeeId,
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
  }

  // Serialize Date objects for Client Component hydration
  const serializedTasks = tasks.map(task => ({
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  }));

  return (
    <AdminTaskBoardClient
      employees={employees}
      selectedEmployeeId={targetEmployeeId}
      initialTasks={serializedTasks as any}
      currentUser={session.user}
    />
  );
}
