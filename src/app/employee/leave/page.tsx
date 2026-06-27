import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import LeaveClient from './leave-client';

export const dynamic = 'force-dynamic';

export default async function EmployeeLeavePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // Fetch all leave records for this employee
  const leaves = await db.attendance.findMany({
    where: {
      employeeId: session.user.id,
      status: { in: ['ON_LEAVE', 'LEAVE'] }
    },
    orderBy: {
      date: 'desc'
    }
  });

  // Fetch holidays to display warnings or show info
  const holidays = await db.holiday.findMany({
    orderBy: {
      date: 'asc'
    }
  });

  return (
    <LeaveClient
      initialLeaves={leaves.map(l => ({
        id: l.id,
        date: l.date.toISOString(),
        status: l.status,
        approvalStatus: l.approvalStatus,
        remarks: l.remarks,
        createdAt: l.createdAt.toISOString()
      }))}
      holidays={holidays.map(h => ({
        id: h.id,
        title: h.title,
        date: h.date.toISOString()
      }))}
    />
  );
}
