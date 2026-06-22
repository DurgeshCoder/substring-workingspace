'use client';

import React, { useState } from 'react';
import { updateTaskStatus } from '@/actions/tasks';
import { 
  CheckSquare, 
  Calendar, 
  User, 
  Loader2, 
  ArrowRight,
  ChevronRight,
  Play,
  CheckCircle,
  Eye,
  Clock,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Modal from '@/components/ui/modal';
import { useRouter } from 'next/navigation';
import { Priority, TaskStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface TaskWithAssigner {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  assignedById: string;
  assignedToId: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface TasksClientProps {
  initialTasks: TaskWithAssigner[];
}

export default function EmployeeTasksClient({ initialTasks }: TasksClientProps) {
  const [selectedTask, setSelectedTask] = useState<TaskWithAssigner | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [draggedOverCol, setDraggedOverCol] = useState<TaskStatus | null>(null);
  const router = useRouter();

  const handleStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    setIsLoading(taskId);
    try {
      const result = await updateTaskStatus(taskId, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Task status updated to ${newStatus}`);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to update task status.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDraggedOverCol(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = initialTasks.find(t => t.id === taskId);
    if (task && task.status !== targetStatus) {
      await handleStatusUpdate(taskId, targetStatus);
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'MEDIUM':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700/50';
    }
  };

  const getColHighlightStyles = (status: TaskStatus) => {
    switch (status) {
      case 'TODO':
        return 'ring-2 ring-indigo-500/40 border-indigo-500/40 bg-slate-900/90 scale-[1.01] shadow-lg shadow-indigo-500/5';
      case 'IN_PROGRESS':
        return 'ring-2 ring-blue-500/40 border-blue-500/40 bg-slate-900/90 scale-[1.01] shadow-lg shadow-blue-500/5';
      case 'REVIEW':
        return 'ring-2 ring-fuchsia-500/40 border-fuchsia-500/40 bg-slate-900/90 scale-[1.01] shadow-lg shadow-fuchsia-500/5';
      case 'COMPLETED':
        return 'ring-2 ring-emerald-500/40 border-emerald-500/40 bg-slate-900/90 scale-[1.01] shadow-lg shadow-emerald-500/5';
      default:
        return '';
    }
  };

  const columns: { label: string; status: TaskStatus; color: string; border: string }[] = [
    { label: 'To Do', status: 'TODO', color: 'text-indigo-400 bg-indigo-500/5', border: 'border-indigo-500/20' },
    { label: 'In Progress', status: 'IN_PROGRESS', color: 'text-blue-400 bg-blue-500/5', border: 'border-blue-500/20' },
    { label: 'In Review', status: 'REVIEW', color: 'text-fuchsia-400 bg-fuchsia-500/5', border: 'border-fuchsia-500/20' },
    { label: 'Completed', status: 'COMPLETED', color: 'text-emerald-400 bg-emerald-500/5', border: 'border-emerald-500/20' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-350">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-white">Task Board</h1>
        <p className="text-xs text-slate-400">
          Manage your task pipeline. Drag & drop cards between columns or click to view details.
        </p>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
        {columns.map((col) => {
          const colTasks = initialTasks.filter(task => task.status === col.status);
          
          return (
            <Card 
              key={col.status} 
              className={`bg-slate-900 border-slate-800 flex flex-col max-h-[80vh] shadow-lg transition-all duration-250 ${
                draggedOverCol === col.status ? getColHighlightStyles(col.status) : ''
              }`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color.split(' ')[0]}`} />
                  <span>{col.label}</span>
                </CardTitle>
                <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-md text-slate-400 font-bold border border-slate-800">
                  {colTasks.length}
                </span>
              </CardHeader>
              
              <Separator className="bg-slate-800/80" />

              <CardContent className="p-3 overflow-y-auto flex-1 space-y-3 min-h-[200px] scrollbar-thin">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="group bg-slate-950 border border-slate-850 hover:border-slate-700/60 rounded-xl p-4 transition-all duration-200 shadow-sm flex flex-col justify-between space-y-3.5 cursor-grab active:cursor-grabbing hover:shadow-md active:scale-[0.98] select-none"
                  >
                    <div 
                      onClick={() => setSelectedTask(task)}
                      className="space-y-2.5 cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border ${getPriorityStyles(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-[9px] text-slate-500 flex items-center font-medium">
                          <Calendar className="w-3 h-3 mr-1" />
                          {task.dueDate ? format(new Date(task.dueDate), 'MMM dd') : 'No due'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 leading-tight group-hover:text-fuchsia-300 transition-colors line-clamp-2">
                        {task.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-850">
                      {/* Assigner Avatar name */}
                      <span className="text-[10px] text-slate-500 flex items-center">
                        <User className="w-3 h-3 mr-1 text-slate-650" />
                        By {task.assignedBy.firstName}
                      </span>

                      {/* Status Transition buttons */}
                      <div className="flex items-center gap-1.5">
                        {isLoading === task.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                        ) : (
                          <>
                            {col.status === 'TODO' && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleStatusUpdate(task.id, 'IN_PROGRESS')}
                                className="h-6 px-2 text-[10px] border-blue-500/20 text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                              >
                                <Play className="w-2.5 h-2.5 mr-1 fill-blue-450" />
                                <span>Start</span>
                              </Button>
                            )}
                            {col.status === 'IN_PROGRESS' && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleStatusUpdate(task.id, 'REVIEW')}
                                className="h-6 px-2 text-[10px] border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/10 cursor-pointer"
                              >
                                <ChevronRight className="w-3 h-3 mr-1" />
                                <span>Review</span>
                              </Button>
                            )}
                            {col.status === 'REVIEW' && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleStatusUpdate(task.id, 'COMPLETED')}
                                className="h-6 px-2 text-[10px] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <CheckCircle className="w-2.5 h-2.5 mr-1" />
                                <span>Done</span>
                              </Button>
                            )}
                            {col.status === 'COMPLETED' && (
                              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>Completed</span>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="py-8 text-center text-[10px] text-slate-600 border border-dashed border-slate-850 rounded-xl">
                    No tasks in this stage
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Task Details Modal */}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Specifications"
      >
        <div className="space-y-4 text-xs text-slate-300">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Title</span>
            <h4 className="text-sm font-bold text-white mt-1 leading-tight">{selectedTask?.title}</h4>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Priority</span>
              <div className="mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${selectedTask ? getPriorityStyles(selectedTask.priority) : ''}`}>
                  {selectedTask?.priority}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Status</span>
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                  {selectedTask?.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Assigned By</span>
              <p className="font-semibold text-slate-200 mt-1 flex items-center">
                <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                {selectedTask?.assignedBy.firstName} {selectedTask?.assignedBy.lastName}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Due Date</span>
              <p className="font-semibold text-slate-300 mt-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-450" />
                {selectedTask?.dueDate ? format(new Date(selectedTask.dueDate), 'MMMM dd, yyyy') : 'No due date'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Task Description</span>
            <p className="mt-2 text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-850 whitespace-pre-line">
              {selectedTask?.description || 'No description provided.'}
            </p>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end pt-4 border-t border-slate-800/80">
            <Button
              type="button"
              onClick={() => setSelectedTask(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
