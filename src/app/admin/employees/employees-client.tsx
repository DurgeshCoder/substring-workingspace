'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEmployeeSchema, updateEmployeeSchema, CreateEmployeeInput, UpdateEmployeeInput } from '@/validations/employee';
import { createEmployee, updateEmployee, deleteEmployee, toggleEmployeeStatus } from '@/actions/employees';
import { 
  UserPlus, 
  UserCheck, 
  UserX, 
  Loader2, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  Mail,
  User,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/ui/modal';
import { useRouter } from 'next/navigation';

interface UserWithDept {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'EMPLOYEE';
  departmentId: string | null;
  designation: string | null;
  joiningDate: Date;
  salary: number | null;
  gender: string | null;
  address: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  department: {
    id: string;
    name: string;
  } | null;
}

interface DepartmentsSelect {
  id: string;
  name: string;
}

interface EmployeesClientProps {
  initialEmployees: UserWithDept[];
  departments: DepartmentsSelect[];
}

export default function EmployeesClient({ initialEmployees, departments }: EmployeesClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<UserWithDept | null>(null);
  const [deletingEmp, setDeletingEmp] = useState<UserWithDept | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(editingEmp ? updateEmployeeSchema : createEmployeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: 'EMPLOYEE',
      departmentId: '',
      designation: '',
      salary: '',
      gender: '',
      address: '',
      status: 'ACTIVE',
    },
  });

  const handleOpenAdd = () => {
    setEditingEmp(null);
    reset({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: 'EMPLOYEE',
      departmentId: '',
      designation: '',
      salary: '',
      gender: 'Male',
      address: '',
      status: 'ACTIVE',
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (emp: UserWithDept) => {
    setEditingEmp(emp);
    reset({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      password: '', // blank by default in edit
      phone: emp.phone || '',
      role: emp.role,
      departmentId: emp.departmentId || '',
      designation: emp.designation || '',
      salary: emp.salary?.toString() || '',
      gender: emp.gender || 'Male',
      address: emp.address || '',
      status: emp.status,
    });
    setIsOpen(true);
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      // Fix empty string for departmentId
      const submissionData = {
        ...data,
        departmentId: data.departmentId === '' ? null : data.departmentId,
        salary: data.salary === '' ? null : parseFloat(data.salary),
      };

      let result;
      if (editingEmp) {
        result = await updateEmployee(editingEmp.id, submissionData);
      } else {
        result = await createEmployee(submissionData);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(editingEmp ? 'Employee updated successfully!' : 'Employee registered successfully!');
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
    if (!deletingEmp) return;
    setIsLoading(true);
    try {
      const result = await deleteEmployee(deletingEmp.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Employee record deleted successfully!');
        setDeletingEmp(null);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to delete employee record.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (emp: UserWithDept) => {
    try {
      const result = await toggleEmployeeStatus(emp.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Employee status toggled to ${result.status}!`);
        router.refresh();
      }
    } catch (err) {
      toast.error('Failed to update employee status.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Employee Management</h1>
          <p className="text-xs text-slate-400">
            View, add, edit and manage credentials for employees.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white rounded-xl shadow-lg shadow-indigo-500/10 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Table grid listing */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {initialEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                        {emp.firstName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-[10px] text-slate-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400">
                    {emp.employeeCode}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {emp.department?.name || <span className="text-slate-600">Unassigned</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {emp.designation || <span className="text-slate-600">N/A</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      emp.role === 'ADMIN' 
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleToggleStatus(emp)}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border cursor-pointer ${
                        emp.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                      }`}
                    >
                      {emp.status === 'ACTIVE' ? (
                        <>
                          <UserCheck className="w-3 h-3 mr-0.5" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3 mr-0.5" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleOpenEdit(emp)}
                        className="text-slate-400 hover:text-white transition-colors px-2 py-1 hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setDeletingEmp(emp)}
                        className="text-rose-400 hover:text-rose-300 transition-colors px-2 py-1 hover:bg-rose-950/20 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {initialEmployees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 space-y-2">
                    <User className="w-8 h-8 mx-auto text-slate-700" />
                    <p className="text-sm font-semibold">No employees found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingEmp ? 'Edit Employee Record' : 'Register New Employee'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">First Name</label>
              <input
                {...register('firstName')}
                type="text"
                placeholder="John"
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              />
              {errors.firstName && <p className="text-rose-400 mt-0.5">{errors.firstName.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">Last Name</label>
              <input
                {...register('lastName')}
                type="text"
                placeholder="Doe"
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              />
              {errors.lastName && <p className="text-rose-400 mt-0.5">{errors.lastName.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="john.doe@company.com"
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              />
              {errors.email && <p className="text-rose-400 mt-0.5">{errors.email.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">
                Password {editingEmp && <span className="text-[10px] text-slate-500">(Leave blank to keep current)</span>}
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder={editingEmp ? "••••••••" : "admin123"}
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              />
              {errors.password && <p className="text-rose-400 mt-0.5">{errors.password.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">Phone</label>
              <input
                {...register('phone')}
                type="text"
                placeholder="+1 555 1234"
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">Department</label>
              <select
                {...register('departmentId')}
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              >
                <option value="">Unassigned</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">Designation</label>
              <input
                {...register('designation')}
                type="text"
                placeholder="Software Engineer"
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">Salary</label>
              <input
                {...register('salary')}
                type="number"
                placeholder="80000"
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">Gender</label>
              <select
                {...register('gender')}
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">System Role</label>
              <select
                {...register('role')}
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 uppercase tracking-wider">Status</label>
              <select
                {...register('status')}
                disabled={isLoading}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 uppercase tracking-wider">Home Address</label>
            <textarea
              {...register('address')}
              rows={2}
              placeholder="Full street name, state, and zip code"
              disabled={isLoading}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition duration-150"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white font-semibold rounded-xl shadow-lg transition duration-150 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{editingEmp ? 'Update' : 'Register'}</span>
              )}
            </button>
          </div>

        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingEmp}
        onClose={() => setDeletingEmp(null)}
        title="Confirm Record Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-xs leading-relaxed">
              WARNING: Deleting the record for <span className="font-bold text-white">"{deletingEmp?.firstName} {deletingEmp?.lastName}"</span> will permanently erase their credentials, profile, and comment threads. Tasks assigned to them will be deleted.
            </p>
          </div>
          <p className="text-xs text-slate-300">
            Are you sure you want to proceed with deleting this record?
          </p>
          <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setDeletingEmp(null)}
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
                <span>Confirm Delete</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
