import React from 'react';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { CheckSquare, Calendar, ArrowRight, User } from 'lucide-react';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EmployeeTasksPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const tasks = await db.task.findMany({
    where: {
      assignedToId: session.user.id,
    },
    include: {
      assignedBy: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'MEDIUM':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700/50';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'REVIEW':
        return 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20';
      case 'IN_PROGRESS':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700/50';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Tasks</h1>
        <p className="text-xs text-slate-400">
          View and manage tasks assigned to you.
        </p>
      </div>

      {/* Tasks listing area */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <div 
            key={task.id}
            className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/60 rounded-2xl p-6 transition-all duration-200 group shadow-md"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Task Details */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-white group-hover:text-fuchsia-300 transition-colors">
                    {task.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getPriorityStyles(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusStyles(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed max-w-3xl">
                  {task.description || 'No description provided.'}
                </p>
              </div>

              {/* Assignment details */}
              <div className="flex items-center space-x-6 shrink-0 border-t border-slate-800 md:border-t-0 pt-4 md:pt-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Assigned By</p>
                    <p className="text-xs font-semibold text-slate-200">
                      {task.assignedBy.firstName} {task.assignedBy.lastName}
                    </p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Due Date</p>
                  <p className="text-xs font-semibold text-slate-300 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    {task.dueDate ? format(task.dueDate, 'MMM dd, yyyy') : 'No due date'}
                  </p>
                </div>

                <button className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-950/40 border border-slate-800 hover:border-slate-700/60 text-slate-400 hover:text-white transition-all">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-16 text-center text-slate-400 space-y-3">
            <CheckSquare className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-sm font-semibold">All caught up!</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              No tasks currently assigned to you. Enjoy your day!
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
