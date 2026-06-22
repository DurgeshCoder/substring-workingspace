'use client';

import React, { useState } from 'react';
import { updateTaskStatus, getComments, createComment } from '@/actions/tasks';
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
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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
  
  // Comment section state variables
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const router = useRouter();

  // Filter completed tasks to show only the 10 most recent
  const boardTasks = React.useMemo(() => {
    const active = initialTasks.filter(t => t.status !== 'COMPLETED');
    const completed = initialTasks
      .filter(t => t.status === 'COMPLETED')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
    return [...active, ...completed];
  }, [initialTasks]);

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

  const handleOpenTaskDetails = (task: TaskWithAssigner) => {
    setSelectedTask(task);
    loadComments(task.id);
  };

  const loadComments = async (taskId: string) => {
    setIsLoadingComments(true);
    try {
      const res = await getComments(taskId);
      if (res.success && res.comments) {
        setComments(res.comments);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async (taskId: string) => {
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const res = await createComment(taskId, newComment);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Comment added successfully!');
        setNewComment('');
        loadComments(taskId);
      }
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
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
        return 'bg-rose-500/10 text-rose-450 border-rose-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-450 border-amber-500/20';
      case 'MEDIUM':
        return 'bg-indigo-500/10 text-indigo-455 border-indigo-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getColHighlightStyles = (status: TaskStatus) => {
    switch (status) {
      case 'TODO':
        return 'ring-2 ring-indigo-500/40 border-indigo-500/40 bg-card/90 scale-[1.01] shadow-lg shadow-indigo-500/5';
      case 'IN_PROGRESS':
        return 'ring-2 ring-blue-500/40 border-blue-500/40 bg-card/90 scale-[1.01] shadow-lg shadow-blue-500/5';
      case 'REVIEW':
        return 'ring-2 ring-fuchsia-500/40 border-fuchsia-500/40 bg-card/90 scale-[1.01] shadow-lg shadow-fuchsia-500/5';
      case 'COMPLETED':
        return 'ring-2 ring-emerald-500/40 border-emerald-500/40 bg-card/90 scale-[1.01] shadow-lg shadow-emerald-500/5';
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
        <p className="text-xs text-muted-foreground">
          Manage your task pipeline. Drag & drop cards between columns or click to view details.
        </p>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
        {columns.map((col) => {
          const colTasks = boardTasks.filter(task => task.status === col.status);
          
          return (
            <Card 
              key={col.status} 
              className={`bg-card border-border flex flex-col max-h-[80vh] shadow-lg transition-all duration-250 ${
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
                <span className="text-[10px] bg-background px-2 py-0.5 rounded-md text-muted-foreground font-bold border border-border">
                  {colTasks.length}
                </span>
              </CardHeader>
              
              <Separator className="bg-muted/80" />

              <CardContent className="p-3 overflow-y-auto flex-1 space-y-3 min-h-[200px] scrollbar-thin">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="group bg-background border border-border hover:border-border/80 rounded-xl p-4 transition-all duration-200 shadow-sm flex flex-col justify-between space-y-3.5 cursor-grab active:cursor-grabbing hover:shadow-md active:scale-[0.98] select-none"
                  >
                    <div 
                      onClick={() => handleOpenTaskDetails(task)}
                      className="space-y-2.5 cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border ${getPriorityStyles(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-[9px] text-muted-foreground flex items-center font-medium">
                          <Calendar className="w-3 h-3 mr-1" />
                          {task.dueDate ? format(new Date(task.dueDate), 'MMM dd') : 'No due'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-tight group-hover:text-fuchsia-300 transition-colors line-clamp-2">
                        {task.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-border">
                      {/* Assigner Avatar name */}
                      <span className="text-[10px] text-muted-foreground flex items-center">
                        <User className="w-3 h-3 mr-1 text-muted-foreground" />
                        By {task.assignedBy.firstName}
                      </span>

                      {/* Status Transition buttons */}
                      <div className="flex items-center gap-1.5">
                        {isLoading === task.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
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
                  <div className="py-8 text-center text-[10px] text-muted-foreground border border-dashed border-border rounded-xl">
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
        <div className="space-y-4 text-xs text-foreground">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Title</span>
            <h4 className="text-sm font-bold text-white mt-1 leading-tight">{selectedTask?.title}</h4>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Priority</span>
              <div className="mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${selectedTask ? getPriorityStyles(selectedTask.priority) : ''}`}>
                  {selectedTask?.priority}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Status</span>
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-card text-foreground border border-border">
                  {selectedTask?.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Assigned By</span>
              <p className="font-semibold text-foreground mt-1 flex items-center">
                <User className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                {selectedTask?.assignedBy.firstName} {selectedTask?.assignedBy.lastName}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Due Date</span>
              <p className="font-semibold text-foreground mt-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                {selectedTask?.dueDate ? format(new Date(selectedTask.dueDate), 'MMMM dd, yyyy') : 'No due date'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Task Description</span>
            <p className="mt-2 text-foreground leading-relaxed bg-background/40 p-3 rounded-xl border border-border whitespace-pre-line">
              {selectedTask?.description || 'No description provided.'}
            </p>
          </div>

          {/* Comments Section */}
          <div className="pt-3 border-t border-border space-y-2.5">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              Comments & Updates
            </span>

            {/* Comments List */}
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {isLoadingComments ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="p-2.5 bg-background/60 border border-border rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-semibold text-indigo-300">
                        {c.user.firstName} {c.user.lastName}
                        <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[7px] font-bold ${
                          c.user.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-405' : 'bg-fuchsia-500/10 text-fuchsia-405'
                        }`}>
                          {c.user.role}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-[9px]">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-4">No comments on this task yet.</p>
              )}
            </div>

            {/* Write Comment Form */}
            {selectedTask && (
              <div className="flex gap-2 pt-1.5">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ask a question or post progress..."
                  rows={2}
                  className="flex-1 text-[11px] bg-background/60 border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:border-indigo-500 transition duration-150 resize-none"
                />
                <Button
                  type="button"
                  onClick={() => handleSubmitComment(selectedTask.id)}
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="px-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-[10px] flex items-center justify-center shrink-0 h-auto cursor-pointer"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Send</span>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="button"
              onClick={() => setSelectedTask(null)}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
