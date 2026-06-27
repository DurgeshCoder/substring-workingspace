import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getHolidays } from '@/actions/attendance';
import HolidaysClient from './holidays-client';

export const dynamic = 'force-dynamic';

export default async function HolidaysPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const holidaysRes = await getHolidays();

  return (
    <HolidaysClient
      initialHolidays={holidaysRes.success ? holidaysRes.holidays || [] : []}
    />
  );
}
