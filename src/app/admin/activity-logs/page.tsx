import React from 'react';
import { db } from '@/lib/db';
import { History, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminActivityLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const logsPerPage = 10;

  const totalItems = await db.activityLog.count();
  const totalPages = Math.ceil(totalItems / logsPerPage);
  const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const logs = await db.activityLog.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    skip: (safePage - 1) * logsPerPage,
    take: logsPerPage,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Activity Logs</h1>
        <p className="text-xs text-muted-foreground">
          Audit trail of actions performed by administrators and employees.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-md">
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs text-foreground">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 flex items-center space-x-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{log.performedBy}</span>
                    </td>
                    <td className="px-6 py-4">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground">
                      {log.entityType} ({log.entityId || 'N/A'})
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        {format(log.createdAt, 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground space-y-3">
            <History className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold">No activity logs found</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Logs will populate here as users perform actions in the system.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-semibold text-foreground">{(safePage - 1) * logsPerPage + 1}</span> to{' '}
            <span className="font-semibold text-foreground">
              {Math.min(safePage * logsPerPage, totalItems)}
            </span>{' '}
            of <span className="font-semibold text-foreground">{totalItems}</span> logs
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/activity-logs?page=${Math.max(1, safePage - 1)}`}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-foreground hover:bg-muted transition-colors ${
                safePage === 1 ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - safePage) <= 1
              ) {
                return (
                  <Link
                    key={page}
                    href={`/admin/activity-logs?page=${page}`}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                      safePage === page
                        ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-650 hover:to-fuchsia-650 text-white border-0 shadow-md font-bold'
                        : 'border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    {page}
                  </Link>
                );
              }
              if (
                (page === 2 && safePage > 3) ||
                (page === totalPages - 1 && safePage < totalPages - 2)
              ) {
                return (
                  <span key={page} className="px-1 text-xs text-muted-foreground select-none">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <Link
              href={`/admin/activity-logs?page=${Math.min(totalPages, safePage + 1)}`}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-foreground hover:bg-muted transition-colors ${
                safePage === totalPages ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
