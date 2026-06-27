import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPendingLeaves } from '@/actions/attendance';
import LeaveClient from './leave-client';

export const dynamic = 'force-dynamic';

export default async function LeavePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const leavesRes = await getPendingLeaves();

  return (
    <LeaveClient
      initialLeaves={leavesRes.success ? leavesRes.leaves || [] : []}
    />
  );
}
