'use server';

import { db } from '@/lib/db';
import { departmentSchema, DepartmentInput } from '@/validations/department';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

async function checkAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin access required.');
  }
  return session.user;
}

export async function createDepartment(data: DepartmentInput) {
  try {
    const admin = await checkAdmin();
    const parsed = departmentSchema.safeParse(data);
    if (!parsed.success) {
      return { error: 'Invalid fields.' };
    }

    const { name, description } = parsed.data;

    // Check if name exists
    const existing = await db.department.findUnique({
      where: { name },
    });

    if (existing) {
      return { error: 'Department name already exists.' };
    }

    const dept = await db.department.create({
      data: {
        name,
        description,
      },
    });

    // Create activity log
    await db.activityLog.create({
      data: {
        action: `Created department: ${name}`,
        entityType: 'Department',
        entityId: dept.id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/departments');
    return { success: true, department: dept };
  } catch (error: any) {
    return { error: error.message || 'Failed to create department.' };
  }
}

export async function updateDepartment(id: string, data: DepartmentInput) {
  try {
    const admin = await checkAdmin();
    const parsed = departmentSchema.safeParse(data);
    if (!parsed.success) {
      return { error: 'Invalid fields.' };
    }

    const { name, description } = parsed.data;

    // Check if name exists for another department
    const existing = await db.department.findFirst({
      where: {
        name,
        NOT: { id },
      },
    });

    if (existing) {
      return { error: 'Department name already exists.' };
    }

    const dept = await db.department.update({
      where: { id },
      data: {
        name,
        description,
      },
    });

    await db.activityLog.create({
      data: {
        action: `Updated department: ${name}`,
        entityType: 'Department',
        entityId: dept.id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/departments');
    return { success: true, department: dept };
  } catch (error: any) {
    return { error: error.message || 'Failed to update department.' };
  }
}

export async function deleteDepartment(id: string) {
  try {
    const admin = await checkAdmin();
    
    // Check if department has users
    const hasUsers = await db.user.findFirst({
      where: { departmentId: id },
    });

    if (hasUsers) {
      return { error: 'Cannot delete department. There are employees assigned to it.' };
    }

    const dept = await db.department.delete({
      where: { id },
    });

    await db.activityLog.create({
      data: {
        action: `Deleted department: ${dept.name}`,
        entityType: 'Department',
        entityId: id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/departments');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete department.' };
  }
}
