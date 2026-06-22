'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema, TaskInput } from '@/validations/task';
import { createTask, updateTask, deleteTask, updateTaskStatus, getComments, createComment } from '@/actions/tasks';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  Loader2, 
  Edit2, 
  Trash2,
  ListFilter,
  MessageSquare,
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Modal from '@/components/ui/modal';
import { useRouter } from 'next/navigation';
import { Priority, TaskStatus } from '@prisma/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface TaskWithRelations {
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
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  };
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface EmployeeSelect {
  id: string;
  firstName: string;
  lastName: string;
}

interface TasksClientProps {
  initialTasks: TaskWithRelations[];
  employees: EmployeeSelect[];
}

export default function TasksClient({ initialTasks, employees }: TasksClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterEmployee, setFilterEmployee] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('ALL');
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const router = useRouter();

  const handleOpenTaskDetails = (task: TaskWithRelations) => {
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: 'TODO',
      assignedToId: '',
      dueDate: '',
    },
  });

  const handleOpenAdd = () => {
    setEditingTask(null);
    reset({
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: 'TODO',
      assignedToId: '',
      dueDate: '',
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (task: TaskWithRelations) => {
    setEditingTask(task);
    reset({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assignedToId: task.assignedToId,
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    });
    setIsOpen(true);
  };

  const onSubmit = async (data: TaskInput) => {
    setIsLoading(true);
    try {
      let result;
      if (editingTask) {
        result = await updateTask(editingTask.id, data);
      } else {
        result = await createTask(data);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(editingTask ? 'Task updated successfully!' : 'Task created and assigned successfully!');
        setIsOpen(false);
        reset();
        router.refresh();
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    setIsLoading(true);
    try {
      const result = await deleteTask(deletingTask.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Task deleted successfully!');
        setDeletingTask(null);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to delete task.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStatusChange = async (task: TaskWithRelations, newStatus: TaskStatus) => {
    try {
      const result = await updateTaskStatus(task.id, newStatus);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Task status updated to ${newStatus}!`);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to update task status.');
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
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
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const filteredTasks = initialTasks.filter(task => {
    // 1. Status Filter
    if (filterStatus !== 'ALL' && task.status !== filterStatus) {
      return false;
    }
    
    // 2. Employee Filter
    if (filterEmployee !== 'ALL' && task.assignedToId !== filterEmployee) {
      return false;
    }

    // 3. Date Filter
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Task Management</h1>
          <p className="text-xs text-muted-foreground">
            Create, schedule, assign, and track progress of system tasks.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white rounded-xl shadow-lg shadow-indigo-500/10 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Filter Control Card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-md">
        <div className="flex items-center space-x-2 text-xs font-bold text-muted-foreground border-b border-border pb-3">
          <ListFilter className="w-4 h-4 text-indigo-400" />
          <span>Filter Tasks</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:border-indigo-500 transition duration-150 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="REVIEW">REVIEW</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Employee Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assigned Employee</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:border-indigo-500 transition duration-150 cursor-pointer"
            >
              <option value="ALL">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Date Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Due Date</label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:border-indigo-500 transition duration-150 cursor-pointer"
            >
              <option value="ALL">Any Due Date</option>
              <option value="TODAY">Due Today</option>
              <option value="THIS_WEEK">Due This Week (Next 7 Days)</option>
              <option value="OVERDUE">Overdue (Incomplete)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks listing area */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div 
            key={task.id}
            className="bg-card border border-border hover:border-border/80 rounded-2xl p-6 transition-all duration-200 group shadow-md"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Task Details */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {task.title}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getPriorityStyles(task.priority)}`}>
                    {task.priority}
                  </span>
                  
                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => handleQuickStatusChange(task, e.target.value as TaskStatus)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border focus:outline-none bg-card cursor-pointer ${getStatusStyles(task.status)}`}
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed max-w-3xl">
                  {task.description || 'No description provided.'}
                </p>
              </div>

              {/* Assignment details */}
              <div className="flex flex-wrap items-center gap-6 shrink-0 border-t border-border lg:border-t-0 pt-4 lg:pt-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Assigned To</p>
                    <p className="text-xs font-semibold text-foreground">
                      {task.assignedTo.firstName} {task.assignedTo.lastName}
                    </p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Due Date</p>
                  <p className="text-xs font-semibold text-foreground flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : 'No due date'}
                  </p>
                </div>

                {/* Operations */}
                <div className="flex items-center space-x-2 pt-2 lg:pt-0">
                  <button 
                    onClick={() => handleOpenTaskDetails(task)}
                    className="p-1.5 bg-background/40 border border-border hover:border-border/80 text-muted-foreground hover:text-indigo-400 rounded-lg transition-all cursor-pointer"
                    title="Specs & Chat"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(task)}
                    className="p-1.5 bg-background/40 border border-border hover:border-border/80 text-muted-foreground hover:text-white rounded-lg transition-all cursor-pointer"
                    title="Edit Task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setDeletingTask(task)}
                    className="p-1.5 bg-background/40 border border-border hover:border-rose-900/60 text-muted-foreground hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="bg-card/50 border border-dashed border-border rounded-2xl p-16 text-center text-muted-foreground space-y-3">
            <CheckSquare className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold">No tasks found</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Create a task and assign it to an employee to begin monitoring system work.
            </p>
          </div>
        )}
      </div>

      {/* Form Modal (Add / Edit) */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingTask ? 'Edit Task' : 'Create Task'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
          
          <div className="space-y-1.5">
            <Label className="font-semibold text-foreground uppercase tracking-wider">Task Title</Label>
            <Input
              {...register('title')}
              type="text"
              placeholder="e.g. Implement API route validations"
              disabled={isLoading}
              className="w-full bg-background/80 border border-border rounded-xl py-2 px-3 text-foreground focus-visible:border-indigo-500 transition duration-150"
            />
            {errors.title && <p className="text-rose-400 mt-0.5">{errors.title.message as string}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-foreground uppercase tracking-wider">Description</Label>
            <Textarea
              {...register('description')}
              rows={3}
              placeholder="Detail the work requirements, links, or context for this assignment..."
              disabled={isLoading}
              className="w-full bg-background/80 border border-border rounded-xl py-2 px-3 text-foreground focus-visible:border-indigo-500 transition duration-150"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-foreground uppercase tracking-wider">Assignee</Label>
              <select
                {...register('assignedToId')}
                disabled={isLoading}
                className="flex h-8 w-full rounded-lg border border-border bg-background/80 px-3 py-1 text-foreground focus:border-indigo-500 transition duration-150 cursor-pointer text-xs"
              >
                <option value="">Select Employee</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
              {errors.assignedToId && <p className="text-rose-400 mt-0.5">{errors.assignedToId.message as string}</p>}
            </div>
            
            <div className="space-y-1.5">
              <Label className="font-semibold text-foreground uppercase tracking-wider">Due Date</Label>
              <Input
                {...register('dueDate')}
                type="date"
                disabled={isLoading}
                className="w-full bg-background/80 border border-border rounded-xl py-2 px-3 text-foreground focus-visible:border-indigo-500 transition duration-150 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-foreground uppercase tracking-wider">Priority</Label>
              <select
                {...register('priority')}
                disabled={isLoading}
                className="flex h-8 w-full rounded-lg border border-border bg-background/80 px-3 py-1 text-foreground focus:border-indigo-500 transition duration-150 cursor-pointer text-xs"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="font-semibold text-foreground uppercase tracking-wider">Status</Label>
              <select
                {...register('status')}
                disabled={isLoading}
                className="flex h-8 w-full rounded-lg border border-border bg-background/80 px-3 py-1 text-foreground focus:border-indigo-500 transition duration-150 cursor-pointer text-xs"
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="REVIEW">REVIEW</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <Separator className="bg-muted/80 my-2" />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="rounded-xl font-semibold transition duration-150 text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-650 hover:to-fuchsia-650 text-white font-semibold rounded-xl shadow-lg transition duration-150 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{editingTask ? 'Update' : 'Create'}</span>
              )}
            </Button>
          </div>

        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        title="Confirm Task Deletion"
      >
        <div className="space-y-4">
          <p className="text-xs text-foreground leading-relaxed">
            Are you sure you want to delete the task <span className="font-bold text-white">"{deletingTask?.title}"</span>? 
            This will permanently remove the task and all associated comments. This action cannot be reversed.
          </p>
          <Separator className="bg-muted/80 my-2" />
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingTask(null)}
              disabled={isLoading}
              className="rounded-xl text-xs font-semibold text-foreground transition duration-150"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              disabled={isLoading}
              className="inline-flex items-center space-x-2 text-white text-xs font-semibold rounded-xl shadow-lg transition duration-150 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Delete Task</span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

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
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-card text-muted-foreground border border-border">
                  {selectedTask?.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Assigned To</span>
              <p className="font-semibold text-foreground mt-1 flex items-center">
                <User className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                {selectedTask?.assignedTo.firstName} {selectedTask?.assignedTo.lastName}
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
                  placeholder="Post comment or reply..."
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
