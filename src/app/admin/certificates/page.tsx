import React from 'react';
import { db } from '@/lib/db';
import { Certificate } from '@prisma/client';
import CertificatesClient from './certificates-client';

export const dynamic = 'force-dynamic';

export default async function AdminCertificatesPage() {
  const certificates = await db.certificate.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Serialize dates for client component
  const serializedCertificates = certificates.map((c: Certificate) => ({
    ...c,
    fromDate: c.fromDate.toISOString(),
    toDate: c.toDate.toISOString(),
    batchId: c.batchId || '',
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return <CertificatesClient initialCertificates={serializedCertificates} />;
}
