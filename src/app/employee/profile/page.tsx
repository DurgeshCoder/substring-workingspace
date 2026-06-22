import React from 'react';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { User, Briefcase, Mail, Phone, Calendar, MapPin, DollarSign, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EmployeeProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { department: true },
  });

  if (!user) {
    redirect('/login');
  }

  const formattedDate = format(user.joiningDate, 'MMMM dd, yyyy');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-xs text-slate-400">
          View your corporate profile details and account status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card Summary */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 text-center space-y-4 shadow-md flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 font-extrabold text-3xl shadow-lg">
            {user.firstName[0]}
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-100">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-xs text-fuchsia-400 font-semibold">{user.designation || 'Software Engineer'}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.employeeCode}</p>
          </div>
          <div className="pt-4 border-t border-slate-800/60 w-full flex justify-around text-center text-xs">
            <div>
              <p className="text-slate-500 uppercase tracking-wider text-[9px] font-semibold">Department</p>
              <p className="font-bold text-slate-300 mt-0.5">{user.department?.name || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase tracking-wider text-[9px] font-semibold">Status</p>
              <p className="font-bold text-emerald-400 mt-0.5">{user.status}</p>
            </div>
          </div>
        </div>

        {/* Profile Details List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-md">
          <h3 className="text-base font-bold text-white border-b border-slate-850 pb-3">
            Employee Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            
            {/* Email */}
            <div className="flex items-start space-x-3">
              <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <p className="text-slate-500 font-semibold mb-0.5">Corporate Email</p>
                <p className="text-slate-200 font-medium">{user.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start space-x-3">
              <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <p className="text-slate-500 font-semibold mb-0.5">Phone Number</p>
                <p className="text-slate-200 font-medium">{user.phone || 'Not specified'}</p>
              </div>
            </div>

            {/* Joining Date */}
            <div className="flex items-start space-x-3">
              <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <p className="text-slate-500 font-semibold mb-0.5">Joining Date</p>
                <p className="text-slate-200 font-medium">{formattedDate}</p>
              </div>
            </div>

            {/* Gender */}
            <div className="flex items-start space-x-3">
              <User className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <p className="text-slate-500 font-semibold mb-0.5">Gender Specification</p>
                <p className="text-slate-200 font-medium">{user.gender || 'Not specified'}</p>
              </div>
            </div>

            {/* Salary */}
            <div className="flex items-start space-x-3">
              <DollarSign className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <p className="text-slate-500 font-semibold mb-0.5">Base Salary</p>
                <p className="text-slate-200 font-medium">
                  {user.salary ? `$${user.salary.toLocaleString()}` : 'Not disclosed'}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start space-x-3">
              <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
              <div>
                <p className="text-slate-500 font-semibold mb-0.5">Residential Address</p>
                <p className="text-slate-200 font-medium leading-relaxed">
                  {user.address || 'No registered address.'}
                </p>
              </div>
            </div>

          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 flex items-start space-x-3 text-slate-400">
            <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              If any specification in your profile is incorrect, please contact the <span className="font-semibold text-indigo-300">Human Resources Department</span>. Credentials are authenticated through the system directory service.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
