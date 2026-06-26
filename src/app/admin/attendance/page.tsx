import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import AdminAttendanceClient from './attendance-client';
import { 
  getShifts, 
  getHolidays, 
  getPendingCorrections, 
  getAdminDashboardStats,
  getPendingLeaves
} from '@/actions/attendance';

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  // Fetch initial data
  const shiftsRes = await getShifts();
  const holidaysRes = await getHolidays();
  const correctionsRes = await getPendingCorrections();
  const leavesRes = await getPendingLeaves();
  const statsRes = await getAdminDashboardStats();


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
    <AdminAttendanceClient
      initialShifts={shiftsRes.success ? shiftsRes.shifts || [] : []}
      initialHolidays={holidaysRes.success ? holidaysRes.holidays || [] : []}
      initialCorrections={correctionsRes.success ? correctionsRes.corrections || [] : []}
      initialLeaves={leavesRes.success ? leavesRes.leaves || [] : []}
      initialStats={statsRes.success ? statsRes.stats : null}
      employees={employees as any}
      departments={departments}
      userDisplayName={`${session.user.firstName} ${session.user.lastName}`}
    />
  );
}
