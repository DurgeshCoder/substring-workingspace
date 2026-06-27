import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getShifts } from '@/actions/attendance';
import ShiftsClient from './shifts-client';

export const dynamic = 'force-dynamic';

export default async function ShiftsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const shiftsRes = await getShifts();

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

  return (
    <ShiftsClient
      initialShifts={shiftsRes.success ? shiftsRes.shifts || [] : []}
      employees={employees as any}
    />
  );
}
