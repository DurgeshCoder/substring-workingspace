import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDailyAttendance } from '@/actions/attendance';
import DailyAttendanceClient from './daily-client';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function AdminDailyAttendancePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const params = await searchParams;
  // Default to today's date in local system format YYYY-MM-DD
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedDate = params.date || todayStr;

  const res = await getDailyAttendance(selectedDate);

  return (
    <DailyAttendanceClient
      initialData={res.success ? res.dailyData || [] : []}
      selectedDate={selectedDate}
    />
  );
}
