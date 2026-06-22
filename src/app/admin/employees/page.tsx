import React from 'react';
import { db } from '@/lib/db';
import EmployeesClient from './employees-client';

export const dynamic = 'force-dynamic';

export default async function AdminEmployeesPage() {
  const employees = await db.user.findMany({
    include: {
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      employeeCode: 'asc',
    },
  });

  const departments = await db.department.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Serialize Date objects for Client Component hydration
  const serializedEmployees = employees.map(emp => ({
    ...emp,
    joiningDate: new Date(emp.joiningDate),
    createdAt: new Date(emp.createdAt),
    updatedAt: new Date(emp.updatedAt),
  }));

  return (
    <EmployeesClient 
      initialEmployees={serializedEmployees as any} 
      departments={departments} 
    />
  );
}
