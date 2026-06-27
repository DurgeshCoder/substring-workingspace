import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle,
  Award,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function EmployeeDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const userDisplayName = `${session.user.firstName} ${session.user.lastName}`;
  const designation = session.user.designation || 'Software Engineer';

  // Fetch employee's assigned shift
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    include: { shift: true },
  });
  let shift = dbUser?.shift ?? null;
  if (!shift) {
    shift = await db.shift.findFirst({ where: { isActive: true } }) ?? null;
  }

  // Helper to format "HH:MM" → "09:00 AM"
  const fmtTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Fetch real-time statistics from DB
  const todoCount = await db.task.count({
    where: { assignedToId: session.user.id, status: 'TODO' }
  });

  const inProgressCount = await db.task.count({
    where: { assignedToId: session.user.id, status: 'IN_PROGRESS' }
  });

  const completedCount = await db.task.count({
    where: { assignedToId: session.user.id, status: 'COMPLETED' }
  });

  // Recent notifications related to employee
  const notifications = await db.notification.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  const stats = [
    { name: 'Assigned Tasks (To Do)', value: todoCount.toString(), icon: CheckSquare, color: 'from-indigo-500 to-blue-500', subtitle: 'Ready to start' },
    { name: 'In Progress', value: inProgressCount.toString(), icon: Clock, color: 'from-amber-500 to-orange-500', subtitle: 'Work underway' },
    { name: 'Completed Tasks', value: completedCount.toString(), icon: Award, color: 'from-emerald-500 to-teal-500', subtitle: 'Tasks finalized' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-fuchsia-900/40 via-indigo-900/10 to-card/50 border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
            Welcome back, {userDisplayName}! <Sparkles className="w-6 h-6 text-fuchsia-400 animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            You are logged in as <span className="font-semibold text-fuchsia-300">{designation}</span>.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Shift Badge */}
          <div className="flex items-center gap-2 bg-background/50 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-semibold text-blue-300">
            <Clock className="w-3.5 h-3.5" />
            {shift
              ? <span>{shift.name}: {fmtTime(shift.startTime)} – {fmtTime(shift.endTime)}</span>
              : <span className="text-muted-foreground">No shift assigned</span>
            }
          </div>
          <div className="flex items-center space-x-3 bg-background/50 border border-border px-4 py-2.5 rounded-xl text-xs font-semibold text-fuchsia-400">
            <AlertCircle className="w-4 h-4" />
            <span>Keep pushing forward!</span>
          </div>
        </div>
      </div>


      {/* Grid of stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                <p className="text-3xl font-bold text-foreground group-hover:scale-105 transition-transform duration-200 origin-left">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${stat.color} flex items-center justify-center text-white shadow-lg opacity-90 group-hover:opacity-100 transition-opacity`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="pt-4 border-t border-border/40 mt-4 flex items-center text-[11px] font-medium text-muted-foreground">
              <span>{stat.subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main dashboard content area - Layout for tasks and activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Workspace Quick Links */}
        <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 space-y-4 shadow-md flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Your Workspace</h3>
            <p className="text-xs text-muted-foreground">
              Access your task board and view your history.
            </p>
          </div>
          <div className="space-y-2.5">
            <Link 
              href="/employee/tasks" 
              className="flex items-center justify-between w-full p-3 bg-background/40 hover:bg-muted/40 border border-border hover:border-border/80 rounded-xl text-xs font-medium text-foreground transition-all group"
            >
              <span>View My Tasks</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-fuchsia-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link 
              href="/employee/profile" 
              className="flex items-center justify-between w-full p-3 bg-background/40 hover:bg-muted/40 border border-border hover:border-border/80 rounded-xl text-xs font-medium text-foreground transition-all group"
            >
              <span>Manage Profile</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-fuchsia-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* Recent Notifications Board */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-lg font-bold text-foreground">Recent Notifications</h3>
              <p className="text-xs text-muted-foreground">
                Updates and task assignments sent to you.
              </p>
            </div>
            <Link href="/employee/notifications" className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors font-medium">
              View all
            </Link>
          </div>
          
          <div className="space-y-3.5">
            {notifications.map((notif) => (
              <div key={notif.id} className="flex items-start space-x-3.5 p-3.5 bg-background/20 border border-border rounded-xl text-xs text-muted-foreground animate-in fade-in duration-200">
                <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${notif.isRead ? "bg-muted-foreground/30" : "bg-fuchsia-500 animate-pulse"}`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold text-foreground ${notif.isRead ? "opacity-70" : ""}`}>{notif.title}</p>
                    <span className="text-[9px] text-muted-foreground font-medium shrink-0">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{notif.message}</p>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No notifications found.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
