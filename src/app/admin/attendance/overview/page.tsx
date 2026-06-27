import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAdminDashboardStats } from '@/actions/attendance';
import OverviewClient from './overview-client';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const statsRes = await getAdminDashboardStats();

  return (
    <OverviewClient
      initialStats={statsRes.success ? statsRes.stats : null}
    />
  );
}
