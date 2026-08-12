import React from 'react';
import { db } from '@/lib/db';
import ReceiptsClient from './receipts-client';

export const dynamic = 'force-dynamic';

export default async function AdminReceiptsPage() {
  const receipts = await db.receipt.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Ensure dates are serialized properly for the client component
  const serializedReceipts = receipts.map((r) => ({
    ...r,
    paymentDate: r.paymentDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return <ReceiptsClient initialReceipts={serializedReceipts} />;
}
