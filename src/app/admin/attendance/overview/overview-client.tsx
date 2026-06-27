'use client';

import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle, 
  AlertCircle, 
  UserMinus, 
  ShieldAlert, 
  Calendar as CalendarIcon, 
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface DashboardStats {
  totalEmployees: number;
  present: number;
  late: number;
  halfDay: number;
  wfh: number;
  absent: number;
  pendingApprovals: number;
  pendingLeaves: number;
}

interface OverviewClientProps {
  initialStats: DashboardStats | null;
}

export default function OverviewClient({ initialStats }: OverviewClientProps) {
  const [stats] = useState<DashboardStats | null>(initialStats);

  const links = [
    { name: 'Corrections', href: '/admin/attendance/correction', description: 'Review & approve check-in/out edits', count: stats?.pendingApprovals ?? 0, color: 'text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/5' },
    { name: 'Manual Entry', href: '/admin/attendance/manual', description: 'Override/insert log records manually', color: 'text-fuchsia-400 border-fuchsia-500/20 hover:bg-fuchsia-500/5' },
    { name: 'Work Shifts', href: '/admin/attendance/shifts', description: 'Configure active timing settings & grace periods', color: 'text-blue-400 border-blue-500/20 hover:bg-blue-500/5' },
    { name: 'Holidays', href: '/admin/attendance/holidays', description: 'Manage calendar holidays and days off', color: 'text-rose-400 border-rose-500/20 hover:bg-rose-500/5' },
    { name: 'Reports', href: '/admin/attendance/report', description: 'Export timesheets and aggregate statistics', color: 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/5' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Overview</h1>
        <p className="text-xs text-muted-foreground">
          Real-time metrics, active indicators, and quick links for shift/attendance management.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
        <Card className="shadow-md hover:border-indigo-500/20 transition group bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Staff</span>
            <p className="text-2xl font-black text-foreground mt-2">{stats?.totalEmployees ?? 0}</p>
            <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active staff list</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:border-emerald-500/20 transition group bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Present Today</span>
            <p className="text-2xl font-black text-foreground mt-2">{stats?.present ?? 0}</p>
            <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Checked-in today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:border-yellow-500/20 transition group bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">Late Arrivals</span>
            <p className="text-2xl font-black text-foreground mt-2">{stats?.late ?? 0}</p>
            <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-yellow-500 animate-bounce" />
              <span>Late arrivals today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:border-rose-500/20 transition group bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Absent Today</span>
            <p className="text-2xl font-black text-foreground mt-2">{stats?.absent ?? 0}</p>
            <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
              <UserMinus className="w-3.5 h-3.5 text-rose-500" />
              <span>Missing check-ins</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:border-indigo-500/20 transition group bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Pending Corrections</span>
            <p className="text-2xl font-black text-foreground mt-2">{stats?.pendingApprovals ?? 0}</p>
            <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Corrections pending</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:border-rose-500/20 transition group bg-card">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Pending Leaves</span>
            <p className="text-2xl font-black text-foreground mt-2">{stats?.pendingLeaves ?? 0}</p>
            <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>Leaves pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main system status card */}
      <Card className="border border-border rounded-3xl p-6 shadow-md bg-card/50">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-indigo-400" /> Real-time System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-xs text-muted-foreground leading-relaxed">
            The metrics above display today's records on a real-time basis. You can manage shifts, corrections, manual entry logs, holidays and generate reports through the corresponding subpages.
          </p>
        </CardContent>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" /> Quick Management Submenu
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {links.map((link) => (
            <Link key={link.name} href={link.href}>
              <div className={`p-5 bg-card/60 backdrop-blur-sm border rounded-2xl hover:shadow-lg hover:scale-[1.01] transition duration-200 cursor-pointer flex flex-col justify-between h-full ${link.color}`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-foreground">{link.name}</span>
                    {typeof link.count === 'number' && link.count > 0 && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                        {link.count} Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">{link.description}</p>
                </div>
                <div className="flex items-center text-[10px] font-semibold mt-4 text-indigo-400 gap-1.5 self-end">
                  <span>Open panel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
