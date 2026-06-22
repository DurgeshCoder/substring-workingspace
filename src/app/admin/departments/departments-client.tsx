'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { departmentSchema, DepartmentInput } from '@/validations/department';
import { createDepartment, updateDepartment, deleteDepartment } from '@/actions/departments';
import { Building2, Plus, Users, Calendar, Loader2, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Modal from '@/components/ui/modal';
import { useRouter } from 'next/navigation';

interface DepartmentWithCount {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    users: number;
  };
}

interface DepartmentsClientProps {
  initialDepartments: DepartmentWithCount[];
}

export default function DepartmentsClient({ initialDepartments }: DepartmentsClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentWithCount | null>(null);
  const [deletingDept, setDeletingDept] = useState<DepartmentWithCount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleOpenAdd = () => {
    setEditingDept(null);
    reset({ name: '', description: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentWithCount) => {
    setEditingDept(dept);
    reset({
      name: dept.name,
      description: dept.description || '',
    });
    setIsOpen(true);
  };

  const onSubmit = async (data: DepartmentInput) => {
    setIsLoading(true);
    try {
      let result;
      if (editingDept) {
        result = await updateDepartment(editingDept.id, data);
      } else {
        result = await createDepartment(data);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(editingDept ? 'Department updated successfully!' : 'Department created successfully!');
        setIsOpen(false);
        reset();
        router.refresh();
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDept) return;
    setIsLoading(true);
    try {
      const result = await deleteDepartment(deletingDept.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Department deleted successfully!');
        setDeletingDept(null);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to delete department.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Department Management</h1>
          <p className="text-xs text-slate-400">
            Create, edit, and organize departments inside the system.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white rounded-xl shadow-lg shadow-indigo-500/10 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Grid of departments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialDepartments.map((dept) => (
          <div 
            key={dept.id} 
            className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/60 rounded-2xl p-6 space-y-4 transition-all duration-200 group flex flex-col justify-between shadow-md"
          >
            <div className="space-y-3">
              {/* Department header */}
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-200">{dept._count.users}</span>
                  <span>employees</span>
                </div>
              </div>

              {/* Department specifications */}
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {dept.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {dept.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Department Footer Info */}
            <div className="pt-4 border-t border-slate-800/40 mt-4 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Created {format(new Date(dept.createdAt), 'MMM dd, yyyy')}
              </span>
              <div className="flex space-x-3 text-slate-400 font-semibold">
                <button 
                  onClick={() => handleOpenEdit(dept)}
                  className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button 
                  onClick={() => setDeletingDept(dept)}
                  className="hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {initialDepartments.length === 0 && (
          <div className="col-span-full bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold">No departments found</p>
            <p className="text-xs text-slate-500">Create one above to begin grouping employees.</p>
          </div>
        )}
      </div>

      {/* Form Modal (Add / Edit) */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={editingDept ? 'Edit Department' : 'Add Department'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Department Name
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Sales, Quality Assurance"
              disabled={isLoading}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs transition duration-200"
            />
            {errors.name && (
              <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Provide a brief explanation of this department's functions."
              disabled={isLoading}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs transition duration-200"
            />
            {errors.description && (
              <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white text-xs font-semibold rounded-xl shadow-lg transition duration-150 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{editingDept ? 'Update' : 'Create'}</span>
              )}
            </button>
          </div>

        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingDept}
        onClose={() => setDeletingDept(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to delete the department <span className="font-bold text-white">"{deletingDept?.name}"</span>? 
            This action cannot be undone. You can only delete departments that do not have active employees assigned.
          </p>
          <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setDeletingDept(null)}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-lg transition duration-150 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Delete Department</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
