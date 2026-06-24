import React from 'react';
import { db } from '@/lib/db';
import { History, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AdminActivityLogsPage() {
  const logs = await db.activityLog.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
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

    </div>
  );
}
