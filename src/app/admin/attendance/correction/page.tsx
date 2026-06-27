import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPendingCorrections } from '@/actions/attendance';
import CorrectionClient from './correction-client';

export const dynamic = 'force-dynamic';

export default async function CorrectionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const correctionsRes = await getPendingCorrections();

  return (
    <CorrectionClient
      initialCorrections={correctionsRes.success ? correctionsRes.corrections || [] : []}
    />
  );
}
