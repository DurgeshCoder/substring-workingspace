'use server';

import { db } from '@/lib/db';
import { createEmployeeSchema, updateEmployeeSchema, CreateEmployeeInput, UpdateEmployeeInput } from '@/validations/employee';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

async function checkAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin access required.');
  }
  return session.user;
}

export async function createEmployee(data: CreateEmployeeInput) {
  try {
    const admin = await checkAdmin();
    const parsed = createEmployeeSchema.safeParse(data);
    if (!parsed.success) {
      return { error: 'Invalid fields: ' + JSON.stringify(parsed.error.flatten().fieldErrors) };
    }

    const val = parsed.data;

    // Check if email exists
    const existing = await db.user.findUnique({
      where: { email: val.email },
    });

    if (existing) {
      return { error: 'Email already registered.' };
    }

    // Check if employeeCode exists
    const existingCode = await db.user.findUnique({
      where: { employeeCode: val.employeeCode },
    });

    if (existingCode) {
      return { error: 'Employee ID already in use.' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(val.password, 10);

    const user = await db.user.create({
      data: {
        employeeCode: val.employeeCode,
        joiningDate: new Date(val.joiningDate),
        firstName: val.firstName,
        lastName: val.lastName,
        email: val.email,
        password: hashedPassword,
        phone: val.phone,
        role: val.role,
        departmentId: val.departmentId,
        designation: val.designation,
        salary: val.salary,
        gender: val.gender,
        address: val.address,
        status: val.status,
      },
    });

    await db.activityLog.create({
      data: {
        action: `Created employee: ${val.firstName} ${val.lastName} (${val.employeeCode})`,
        entityType: 'User',
        entityId: user.id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/employees');
    return { success: true, employee: user };
  } catch (error: any) {
    return { error: error.message || 'Failed to create employee.' };
  }
}

export async function updateEmployee(id: string, data: UpdateEmployeeInput) {
  try {
    const admin = await checkAdmin();
    const parsed = updateEmployeeSchema.safeParse(data);
    if (!parsed.success) {
      return { error: 'Invalid fields.' };
    }

    const val = parsed.data;

    // Check if email exists for another user
    const existing = await db.user.findFirst({
      where: {
        email: val.email,
        NOT: { id },
      },
    });

    if (existing) {
      return { error: 'Email already registered to another user.' };
    }

    // Check if employeeCode exists for another user
    const existingCode = await db.user.findFirst({
      where: {
        employeeCode: val.employeeCode,
        NOT: { id },
      },
    });

    if (existingCode) {
      return { error: 'Employee ID already in use.' };
    }

    // Build update object
    const updateData: any = {
      employeeCode: val.employeeCode,
      joiningDate: new Date(val.joiningDate),
      firstName: val.firstName,
      lastName: val.lastName,
      email: val.email,
      phone: val.phone,
      role: val.role,
      departmentId: val.departmentId || null,
      designation: val.designation,
      salary: val.salary,
      gender: val.gender,
      address: val.address,
      status: val.status,
    };

    // If password is changed, hash it
    if (val.password && val.password.trim() !== '') {
      updateData.password = await bcrypt.hash(val.password, 10);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    await db.activityLog.create({
      data: {
        action: `Updated employee specifications: ${val.firstName} ${val.lastName}`,
        entityType: 'User',
        entityId: user.id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/employees');
    return { success: true, employee: user };
  } catch (error: any) {
    return { error: error.message || 'Failed to update employee.' };
  }
}

export async function deleteEmployee(id: string) {
  try {
    const admin = await checkAdmin();

    // Prevent deleting oneself
    if (admin.id === id) {
      return { error: 'Cannot delete your own administrative account.' };
    }

    const user = await db.user.delete({
      where: { id },
    });

    await db.activityLog.create({
      data: {
        action: `Deleted employee record: ${user.firstName} ${user.lastName} (${user.employeeCode})`,
        entityType: 'User',
        entityId: id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete employee.' };
  }
}

export async function toggleEmployeeStatus(id: string) {
  try {
    const admin = await checkAdmin();

    const currentUser = await db.user.findUnique({
      where: { id },
    });

    if (!currentUser) {
      return { error: 'Employee not found.' };
    }

    // Prevent deactivating oneself
    if (admin.id === id) {
      return { error: 'Cannot deactivate your own administrative account.' };
    }

    const newStatus = currentUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const user = await db.user.update({
      where: { id },
      data: { status: newStatus },
    });

    await db.activityLog.create({
      data: {
        action: `${newStatus === 'ACTIVE' ? 'Activated' : 'Deactivated'} employee: ${user.firstName} ${user.lastName}`,
        entityType: 'User',
        entityId: user.id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/employees');
    return { success: true, status: newStatus };
  } catch (error: any) {
    return { error: error.message || 'Failed to update employee status.' };
  }
}
