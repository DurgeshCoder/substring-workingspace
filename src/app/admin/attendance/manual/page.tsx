import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import ManualClient from './manual-client';

export const dynamic = 'force-dynamic';

export default async function ManualPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Fetch active employees
  const employees = await db.user.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      email: true,
      shiftId: true,
    },
    orderBy: { firstName: 'asc' },
  });

  // Fetch departments
  const departments = await db.department.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <ManualClient
      employees={employees as any}
      departments={departments}
    />
  );
}
