import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { 
  Users, 
  Building2, 
  CheckSquare, 
  Clock, 
  TrendingUp,
  Activity,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const userDisplayName = `${session.user.firstName} ${session.user.lastName}`;

  // Fetch real-time statistics from DB
  const employeeCount = await db.user.count({
    where: { role: 'EMPLOYEE' }
  });

  const departmentCount = await db.department.count();

  const activeTasksCount = await db.task.count({
    where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } }
  });

  const now = new Date();
  const overdueCount = await db.task.count({
    where: {
      dueDate: { lt: now },
      status: { notIn: ['COMPLETED', 'CANCELLED'] }
    }
  });

  const recentLogs = await db.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const stats = [
    { name: 'Total Employees', value: employeeCount.toString(), icon: Users, color: 'from-blue-500 to-indigo-500', pct: 'Registered active employees' },
    { name: 'Active Departments', value: departmentCount.toString(), icon: Building2, color: 'from-emerald-500 to-teal-500', pct: 'Configured divisions' },
    { name: 'Pending Tasks', value: activeTasksCount.toString(), icon: CheckSquare, color: 'from-amber-500 to-orange-500', pct: 'In progress or to do' },
    { name: 'Overdue Tasks', value: overdueCount.toString(), icon: Clock, color: 'from-rose-500 to-pink-500', pct: 'Require immediate action' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-fuchsia-900/10 to-card/50 border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Welcome back, {userDisplayName}!
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Here's what is happening across the organization today.
          </p>
        </div>
        <div className="flex items-center space-x-3 bg-background/50 border border-border px-4 py-2.5 rounded-xl text-xs font-semibold text-indigo-400">
          <Activity className="w-4 h-4 animate-pulse" />
          <span>System status: Operational</span>
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div 
            key={stat.name}
            className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between hover:border-border/80 transition-all duration-200 group shadow-md"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.name}
                </span>
                <p className="text-3xl font-bold text-white group-hover:scale-105 transition-transform duration-200 origin-left">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${stat.color} flex items-center justify-center text-white shadow-lg opacity-90 group-hover:opacity-100 transition-opacity`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="pt-4 border-t border-border/40 mt-4 flex items-center text-[11px] font-medium text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
              <span>{stat.pct}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main dashboard content area - Layout for tasks and activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions (Col 1) */}
        <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 space-y-4 shadow-md flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Quick Actions</h3>
            <p className="text-xs text-muted-foreground">
              Common administrative tasks you can execute.
            </p>
          </div>
          <div className="space-y-2.5">
            <Link 
              href="/admin/employees" 
              className="flex items-center justify-between w-full p-3 bg-background/40 hover:bg-muted/40 border border-border hover:border-border/80 rounded-xl text-xs font-medium text-foreground transition-all group"
            >
              <span>Add New Employee</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link 
              href="/admin/departments" 
              className="flex items-center justify-between w-full p-3 bg-background/40 hover:bg-muted/40 border border-border hover:border-border/80 rounded-xl text-xs font-medium text-foreground transition-all group"
            >
              <span>Manage Departments</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link 
              href="/admin/tasks" 
              className="flex items-center justify-between w-full p-3 bg-background/40 hover:bg-muted/40 border border-border hover:border-border/80 rounded-xl text-xs font-medium text-foreground transition-all group"
            >
              <span>Assign A Task</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* System Activity (Col 2 & 3) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-lg font-bold text-white">Recent Activity</h3>
              <p className="text-xs text-muted-foreground">
                Live updates and audit logs.
              </p>
            </div>
            <Link href="/admin/activity-logs" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              View all
            </Link>
          </div>
          
          <div className="space-y-3.5">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3.5 p-3.5 bg-background/20 border border-border rounded-xl text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                <div className="flex-1 space-y-0.5">
                  <p className="font-semibold text-foreground">{log.action}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {log.performedBy} • {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No recent activity logs found.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
