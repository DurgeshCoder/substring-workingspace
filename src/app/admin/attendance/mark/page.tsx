import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AttendanceClient from '@/app/employee/attendance/attendance-client';
import { getTodayAttendance, getEmployeeStats } from '@/actions/attendance';

export const dynamic = 'force-dynamic';

export default async function AdminAttendancePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const todayRes = await getTodayAttendance();
  const statsRes = await getEmployeeStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Mark Attendance</h1>
        <p className="text-xs text-muted-foreground">
          As an administrator, you can check in, check out, and manage your daily attendance logs just like an employee.
        </p>
      </div>

      <AttendanceClient
        initialTodayRecord={todayRes.success ? todayRes.record : null}
        initialStats={statsRes.success ? statsRes.stats : null}
        userDisplayName={`${session.user.firstName} ${session.user.lastName}`}
        userId={session.user.id}
        shift={todayRes.success ? (todayRes.shift ?? null) : null}
      />
    </div>
  );
}
