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
  MessageSquare,
  Search,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Modal from '@/components/ui/modal';
import { useRouter } from 'next/navigation';
import { Priority, TaskStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

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

interface TaskListClientProps {
  initialTasks: TaskWithAssigner[];
}

export default function EmployeeTaskListClient({ initialTasks }: TaskListClientProps) {
  const [selectedTask, setSelectedTask] = useState<TaskWithAssigner | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  
  // Search & Filter state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('ALL');

  // Comments state variables
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

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

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-450 border border-amber-500/20';
      case 'MEDIUM':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
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
        return 'bg-rose-500/10 text-rose-455 border border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  // Perform client-side filtering on all tasks
  const filteredTasks = initialTasks.filter(task => {
    // 1. Search term
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(query);
      const descMatch = task.description ? task.description.toLowerCase().includes(query) : false;
      if (!titleMatch && !descMatch) {
        return false;
      }
    }

    // 2. Status
    if (filterStatus !== 'ALL' && task.status !== filterStatus) {
      return false;
    }

    // 3. Priority
    if (filterPriority !== 'ALL' && task.priority !== filterPriority) {
      return false;
    }

    // 4. Date
    if (filterDate !== 'ALL') {
      if (!task.dueDate) {
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (filterDate === 'TODAY') {
        if (dueDate.getTime() !== today.getTime()) {
          return false;
        }
      } else if (filterDate === 'THIS_WEEK') {
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        if (dueDate < today || dueDate > nextWeek) {
          return false;
        }
      } else if (filterDate === 'OVERDUE') {
        if (dueDate >= today || task.status === 'COMPLETED' || task.status === 'CANCELLED') {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Task List</h1>
        <p className="text-xs text-muted-foreground">
          View all your assigned tasks. Use filters to narrow down search results.
        </p>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by task title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-xs bg-background/40 border-border rounded-xl text-foreground focus-visible:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs bg-background/60 border border-border rounded-xl py-2.5 px-3 text-foreground focus:outline-none focus:border-indigo-500 transition duration-150 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="REVIEW">REVIEW</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full text-xs bg-background/60 border border-border rounded-xl py-2.5 px-3 text-foreground focus:outline-none focus:border-indigo-500 transition duration-150 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          {/* Due Date Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Due Date</label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full text-xs bg-background/60 border border-border rounded-xl py-2.5 px-3 text-foreground focus:outline-none focus:border-indigo-500 transition duration-150 cursor-pointer"
            >
              <option value="ALL">Any Due Date</option>
              <option value="TODAY">Due Today</option>
              <option value="THIS_WEEK">Due This Week (Next 7 Days)</option>
              <option value="OVERDUE">Overdue (Incomplete)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Grid */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card 
            key={task.id} 
            className="bg-card border border-border hover:border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Side: Specs */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground">{task.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${getPriorityStyles(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border ${getStatusStyles(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed max-w-2xl">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Right Side: Assigner, Due Date & Actions */}
              <div className="flex flex-wrap items-center gap-6 shrink-0 md:border-l border-border md:pl-6 pt-3 md:pt-0">
                <div className="space-y-0.5 text-xs">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Assigned By</p>
                  <p className="font-semibold text-foreground flex items-center">
                    <User className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    By {task.assignedBy.firstName}
                  </p>
                </div>

                <div className="space-y-0.5 text-xs">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Due Date</p>
                  <p className="font-semibold text-foreground flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : 'No due date'}
                  </p>
                </div>

                {/* Operations */}
                <div className="flex items-center gap-2">
                  {isLoading === task.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      {task.status === 'TODO' && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleStatusUpdate(task.id, 'IN_PROGRESS')}
                          className="h-7 text-[10px] border-blue-500/20 text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          <span>Start</span>
                        </Button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleStatusUpdate(task.id, 'REVIEW')}
                          className="h-7 text-[10px] border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/10 cursor-pointer"
                        >
                          <ChevronRight className="w-3 h-3 mr-1" />
                          <span>Review</span>
                        </Button>
                      )}
                      {task.status === 'REVIEW' && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleStatusUpdate(task.id, 'COMPLETED')}
                          className="h-7 text-[10px] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span>Done</span>
                        </Button>
                      )}
                    </>
                  )}
                  
                  <Button
                    size="xs"
                    onClick={() => handleOpenTaskDetails(task)}
                    className="h-7 px-2.5 text-[10px] bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl cursor-pointer flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Specs & Chat</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center text-muted-foreground space-y-3">
            <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-semibold">No tasks found matching your filters</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Try adjusting your query or filter tags to find the specified assignments.
            </p>
          </div>
        )}
      </div>

      {/* Task Details Modal with Comments Thread */}
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
              Comments & Discussion
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
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
