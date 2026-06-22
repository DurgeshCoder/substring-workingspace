import React from 'react';
import { db } from '@/lib/db';
import DepartmentsClient from './departments-client';

export const dynamic = 'force-dynamic';

export default async function AdminDepartmentsPage() {
  const departments = await db.department.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Ensure dates are compatible for client components
  const serializedDepartments = departments.map(d => ({
    ...d,
    createdAt: new Date(d.createdAt),
    updatedAt: new Date(d.updatedAt),
  }));

  return <DepartmentsClient initialDepartments={serializedDepartments} />;
}
