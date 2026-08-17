'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

async function checkAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin access required.');
  }
  return session.user;
}

export interface CreateCertificateInput {
  studentId: string;
  name: string;
  fromDate: string; // ISO string or date string
  toDate: string; // ISO string or date string
  course?: string;
  batchId?: string;
}

export async function createCertificates(data: CreateCertificateInput[]) {
  try {
    const admin = await checkAdmin();
    
    if (!Array.isArray(data) || data.length === 0) {
      return { error: 'No certificate data provided.' };
    }

    const created = [];
    for (const item of data) {
      if (!item.name || !item.studentId || !item.fromDate || !item.toDate) {
        continue; // skip invalid records
      }

      const cert = await db.certificate.create({
        data: {
          studentId: item.studentId.trim(),
          name: item.name.trim(),
          fromDate: new Date(item.fromDate),
          toDate: new Date(item.toDate),
          course: item.course?.trim() || 'MERN STACK',
          batchId: item.batchId?.trim() || null,
        },
      });
      created.push(cert);
    }

    // Create activity log
    await db.activityLog.create({
      data: {
        action: `Uploaded and generated ${created.length} student certificates`,
        entityType: 'Certificate',
        entityId: created[0]?.id || null,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/certificates');
    return { success: true, count: created.length };
  } catch (error: any) {
    return { error: error.message || 'Failed to create certificates.' };
  }
}

export async function getCertificates(search?: string) {
  try {
    await checkAdmin();
    
    const certificates = await db.certificate.findMany({
      where: search ? {
        OR: [
          { name: { contains: search } },
          { studentId: { contains: search } },
          { course: { contains: search } },
          { batchId: { contains: search } },
        ]
      } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, certificates };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch certificates.' };
  }
}

export async function deleteCertificate(id: string) {
  try {
    const admin = await checkAdmin();
    const cert = await db.certificate.delete({
      where: { id },
    });

    await db.activityLog.create({
      data: {
        action: `Deleted certificate for student ${cert.name} (${cert.studentId})`,
        entityType: 'Certificate',
        entityId: id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/certificates');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete certificate.' };
  }
}

export async function clearAllCertificates() {
  try {
    const admin = await checkAdmin();
    await db.certificate.deleteMany({});

    await db.activityLog.create({
      data: {
        action: `Cleared all student certificates from database`,
        entityType: 'Certificate',
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/certificates');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to clear certificates.' };
  }
}
