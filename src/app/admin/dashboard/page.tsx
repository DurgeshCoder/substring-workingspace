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
  ArrowRight,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import DashboardCharts from '@/components/dashboard/dashboard-charts';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const userDisplayName = `${session.user.firstName} ${session.user.lastName}`;

  // Daily motivational quotes list
  const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "Productivity is being able to do things that you were never able to do before.", author: "Franz Kafka" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { text: "Your talent determines what you can do. Your motivation determines how much you are willing to do.", author: "Lou Holtz" }
  ];

  // Pick quote of the day deterministically
  const dateIndex = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
  const dailyQuote = quotes[dateIndex % quotes.length];

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

  // Weekly task completion trends
  const taskData = [
    { day: 'Mon', thisWeek: 4, prevWeek: 3 },
    { day: 'Tue', thisWeek: 6, prevWeek: 5 },
    { day: 'Wed', thisWeek: 8, prevWeek: 4 },
    { day: 'Thu', thisWeek: 5, prevWeek: 6 },
    { day: 'Fri', thisWeek: 9, prevWeek: 7 },
    { day: 'Sat', thisWeek: 3, prevWeek: 2 },
  ];

  // Daily logged work hours trend (variance)
  const hoursData = [
    { day: 'Mon', hours: 7.8 },
    { day: 'Tue', hours: 8.2 },
    { day: 'Wed', hours: 8.5 },
    { day: 'Thu', hours: 8.0 },
    { day: 'Fri', hours: 8.3 },
    { day: 'Sat', hours: 4.5 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/5 to-card border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl dark:from-indigo-900/40 dark:via-fuchsia-900/10 dark:to-card/50">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
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

      {/* Daily Motivational Quote Card */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center gap-4 hover:border-border/80 transition duration-200">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/5 flex items-center justify-center text-indigo-500 shrink-0">
          <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Quote of the Day</div>
          <p className="text-sm font-medium text-foreground italic mt-1 leading-relaxed">
            "{dailyQuote.text}"
          </p>
          <span className="text-xs text-muted-foreground block mt-1">— {dailyQuote.author}</span>
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
                <p className="text-3xl font-bold text-foreground group-hover:scale-105 transition-transform duration-200 origin-left">
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

      {/* Charts Section */}
      <DashboardCharts taskData={taskData} hoursData={hoursData} />

      {/* Main dashboard content area - Layout for tasks and activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions (Col 1) */}
        <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 space-y-4 shadow-md flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Quick Actions</h3>
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
              <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
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
