'use server';

import { db } from '@/lib/db';
import { receiptSchema, ReceiptInput } from '@/validations/receipt';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

async function checkAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized. Admin access required.');
  }
  return session.user;
}

export async function createReceipt(data: ReceiptInput) {
  try {
    const admin = await checkAdmin();
    const parsed = receiptSchema.safeParse(data);
    if (!parsed.success) {
      return { error: 'Invalid fields.' };
    }

    const { studentId, studentName, batch, batchCode, totalAmount, dueAmount, paidAmount, paymentDate } = parsed.data;

    // Generate unique receipt number
    let receiptNo = '';
    let attempts = 0;
    while (attempts < 10) {
      const count = await db.receipt.count();
      const nextNum = count + 1 + attempts;
      const dateObj = paymentDate ? new Date(paymentDate) : new Date();
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      receiptNo = `REC-${year}${month}-${String(nextNum).padStart(4, '0')}`;

      // Check for conflict
      const existing = await db.receipt.findUnique({
        where: { receiptNo },
      });
      if (!existing) {
        break;
      }
      attempts++;
    }

    const receipt = await db.receipt.create({
      data: {
        receiptNo,
        studentId: studentId || '',
        studentName,
        batch,
        batchCode: batchCode || '',
        totalAmount: totalAmount || 0,
        dueAmount,
        paidAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      },
    });

    // Create activity log
    await db.activityLog.create({
      data: {
        action: `Generated fee receipt ${receiptNo} for student ${studentName}`,
        entityType: 'Receipt',
        entityId: receipt.id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/receipts');
    return { success: true, receipt };
  } catch (error: any) {
    return { error: error.message || 'Failed to create receipt.' };
  }
}

export async function getReceipts(search?: string) {
  try {
    await checkAdmin();
    
    const receipts = await db.receipt.findMany({
      where: search ? {
        OR: [
          { studentName: { contains: search } },
          { receiptNo: { contains: search } },
          { batch: { contains: search } },
        ]
      } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, receipts };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch receipts.' };
  }
}

export async function getReceiptById(id: string) {
  try {
    await checkAdmin();
    const receipt = await db.receipt.findUnique({
      where: { id },
    });
    if (!receipt) {
      return { error: 'Receipt not found.' };
    }
    return { success: true, receipt };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch receipt.' };
  }
}

export async function deleteReceipt(id: string) {
  try {
    const admin = await checkAdmin();
    const receipt = await db.receipt.delete({
      where: { id },
    });

    await db.activityLog.create({
      data: {
        action: `Deleted fee receipt ${receipt.receiptNo} of ${receipt.studentName}`,
        entityType: 'Receipt',
        entityId: id,
        performedBy: `${admin.firstName} ${admin.lastName}`,
      },
    });

    revalidatePath('/admin/receipts');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete receipt.' };
  }
}
