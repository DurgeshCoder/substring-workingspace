'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

async function checkUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized. Access required.');
  }
  return session.user;
}

export async function markAsRead(id: string) {
  try {
    const user = await checkUser();
    
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== user.id) {
      return { error: 'Notification not found.' };
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    revalidatePath('/admin/notifications');
    revalidatePath('/employee/notifications');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update notification.' };
  }
}

export async function markAllAsRead() {
  try {
    const user = await checkUser();

    await db.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    revalidatePath('/admin/notifications');
    revalidatePath('/employee/notifications');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update notifications.' };
  }
}

export async function getUnreadCount() {
  try {
    const user = await checkUser();
    const count = await db.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });
    return { success: true, count };
  } catch (error: any) {
    return { success: false, count: 0, error: error.message || 'Failed to fetch unread count.' };
  }
}
