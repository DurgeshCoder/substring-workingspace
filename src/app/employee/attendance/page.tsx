import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AttendanceClient from './attendance-client';
import { getTodayAttendance, getEmployeeStats } from '@/actions/attendance';

export const dynamic = 'force-dynamic';

export default async function EmployeeAttendancePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const todayRes = await getTodayAttendance();
  const statsRes = await getEmployeeStats();

  return (
    <AttendanceClient
      initialTodayRecord={todayRes.success ? todayRes.record : null}
      initialStats={statsRes.success ? statsRes.stats : null}
      userDisplayName={`${session.user.firstName} ${session.user.lastName}`}
      userId={session.user.id}
      shift={todayRes.success ? (todayRes.shift ?? null) : null}
    />
  );
}
