import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getHolidays } from '@/actions/attendance';
import ReportClient from './report-client';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const holidaysRes = await getHolidays();

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
    <ReportClient
      employees={employees as any}
      departments={departments}
      initialHolidays={holidaysRes.success ? holidaysRes.holidays || [] : []}
    />
  );
}
