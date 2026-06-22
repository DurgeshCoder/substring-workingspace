import React from 'react';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import NotificationsClient from '@/components/notifications-client';

export const dynamic = 'force-dynamic';

export default async function EmployeeNotificationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const notifications = await db.notification.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Serialize Date objects for Client Component hydration
  const serializedNotifications = notifications.map(n => ({
    ...n,
    createdAt: new Date(n.createdAt),
  }));

  return <NotificationsClient notifications={serializedNotifications as any} />;
}
