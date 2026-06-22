import React from 'react';
import { Bell } from 'lucide-react';

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-xs text-slate-400">
          Manage system alerts and updates.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-16 text-center text-slate-400 space-y-3 shadow-md">
        <Bell className="w-10 h-10 text-slate-700 mx-auto" />
        <p className="text-sm font-semibold">No notifications</p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          You are all caught up. We'll alert you here when new events occur.
        </p>
      </div>
    </div>
  );
}
