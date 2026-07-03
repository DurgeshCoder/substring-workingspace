'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Calendar as CalendarIcon, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  MapPin,
  Laptop,
  Building2,
  Clock,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatTime12h, formatShortLocalDateString } from '../shared-helpers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface DailyAttendanceItem {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    email: string;
    role: string;
    department: {
      name: string;
    } | null;
  };
  attendance: {
    id: string;
    date: Date | string;
    checkIn: Date | string | null;
    checkOut: Date | string | null;
    status: string;
    workingMinutes: number;
    breakMinutes: number;
    overtimeMinutes: number;
    lateMinutes: number;
    address: string | null;
    device: string | null;
    approvalStatus: string;
    approvedBy: { firstName: string; lastName: string } | null;
    remarks: string | null;
  } | null;
}

interface DailyAttendanceClientProps {
  initialData: DailyAttendanceItem[];
  selectedDate: string;
}

export default function DailyAttendanceClient({ initialData, selectedDate }: DailyAttendanceClientProps) {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(
    selectedDate ? new Date(selectedDate) : new Date()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, deptFilter]);

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      const yyyy = newDate.getFullYear();
      const mm = String(newDate.getMonth() + 1).padStart(2, '0');
      const dd = String(newDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      router.push(`/admin/attendance/daily?date=${dateStr}`);
    }
  };

  // Get unique departments for the filter dropdown
  const departments = Array.from(
    new Set(
      initialData
        .map(item => item.employee.department?.name)
        .filter((name): name is string => !!name)
    )
  );

  // Check if selected date is in the future compared to today's date
  const selectedDateObj = new Date(selectedDate);
  selectedDateObj.setHours(0, 0, 0, 0);
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const isFutureDate = selectedDateObj.getTime() > todayObj.getTime();

  // Day statistics (computed on total dataset for the selected date)
  const totalStaff = initialData.length;
  const presentCount = initialData.filter(item => 
    item.attendance?.status === 'PRESENT' || 
    item.attendance?.status === 'HALF_DAY'
  ).length;
  const lateCount = initialData.filter(item => 
    item.attendance && item.attendance.lateMinutes > 0
  ).length;
  const absentCount = isFutureDate ? 0 : initialData.filter(item => 
    !item.attendance || 
    item.attendance.status === 'ABSENT'
  ).length;
  const wfhCount = initialData.filter(item => 
    item.attendance?.status === 'WFH'
  ).length;
  const leaveCount = initialData.filter(item => 
    item.attendance?.status === 'ON_LEAVE'
  ).length;
  const notMarkedCount = isFutureDate ? initialData.filter(item => !item.attendance).length : 0;

  // Filter logic
  const filteredData = initialData.filter(item => {
    // 1. Search term match (First name, Last name, Code)
    const fullName = `${item.employee.firstName} ${item.employee.lastName}`.toLowerCase();
    const code = item.employee.employeeCode.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    if (searchTerm && !fullName.includes(searchLower) && !code.includes(searchLower)) {
      return false;
    }

    // 2. Status match
    const status = item.attendance?.status || (isFutureDate ? 'NOT_MARKED' : 'ABSENT');
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ABSENT') {
        if (isFutureDate) return false;
        if (item.attendance && status !== 'ABSENT') return false;
      } else if (statusFilter === 'NOT_MARKED') {
        if (item.attendance) return false;
      } else if (status !== statusFilter) {
        return false;
      }
    }

    // 3. Department match
    const dept = item.employee.department?.name || '';
    if (deptFilter !== 'ALL' && dept !== deptFilter) {
      return false;
    }

    return true;
  });

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Formatter for working / overtime minutes
  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return '—';
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'ABSENT':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'ON_LEAVE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'WFH':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'HALF_DAY':
        return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
      case 'NOT_MARKED':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Datepicker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Attendance</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Showing attendance details for <span className="font-semibold text-foreground">{formatShortLocalDateString(new Date(selectedDate))}</span>
          </p>
        </div>

        {/* Date Selector Popover (Shadcn UI) */}
        <div className="flex items-center space-x-2 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[220px] justify-start text-left font-normal text-xs border border-border bg-card rounded-xl h-9.5 transition-colors cursor-pointer text-foreground hover:bg-muted"
                )}
              >
                <CalendarIcon className="w-4 h-4 mr-2 text-indigo-400" />
                {date ? format(date, "PPP") : <span>Pick Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border border-border rounded-xl" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Staff</span>
            <p className="text-xl font-black text-foreground mt-1">{totalStaff}</p>
            <div className="flex items-center text-[9px] text-muted-foreground mt-3 gap-1">
              <Users className="w-3 h-3 text-indigo-400" />
              <span>Active employees</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:border-emerald-500/20 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Present</span>
            <p className="text-xl font-black text-foreground mt-1">{presentCount}</p>
            <div className="flex items-center text-[9px] text-muted-foreground mt-3 gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span>Checked in today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:border-rose-500/20 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between">
            <span className={cn(
              "text-[10px] uppercase font-bold",
              isFutureDate ? "text-muted-foreground" : "text-rose-400"
            )}>
              {isFutureDate ? "Not Marked" : "Absent"}
            </span>
            <p className="text-xl font-black text-foreground mt-1">
              {isFutureDate ? notMarkedCount : absentCount}
            </p>
            <div className="flex items-center text-[9px] text-muted-foreground mt-3 gap-1">
              <XCircle className={cn("w-3 h-3", isFutureDate ? "text-muted-foreground" : "text-rose-500")} />
              <span>{isFutureDate ? "Unmarked future schedule" : "Missing records"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:border-blue-500/20 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-blue-400">WFH</span>
            <p className="text-xl font-black text-foreground mt-1">{wfhCount}</p>
            <div className="flex items-center text-[9px] text-muted-foreground mt-3 gap-1">
              <Laptop className="w-3 h-3 text-blue-400" />
              <span>Remote status</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:border-amber-500/20 transition-colors">
          <CardContent className="p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-400">On Leave</span>
            <p className="text-xl font-black text-foreground mt-1">{leaveCount}</p>
            <div className="flex items-center text-[9px] text-muted-foreground mt-3 gap-1">
              <Briefcase className="w-3 h-3 text-amber-400" />
              <span>Approved leaves</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls Card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Search bar */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Search Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-xs bg-background border border-border rounded-xl py-2 text-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:border-indigo-500 transition duration-150 cursor-pointer h-9.5"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">PRESENT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="NOT_MARKED">NOT MARKED</option>
              <option value="ON_LEAVE">ON LEAVE</option>
              <option value="WFH">WFH</option>
              <option value="HALF_DAY">HALF DAY</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:border-indigo-500 transition duration-150 cursor-pointer h-9.5"
            >
              <option value="ALL">All Departments</option>
              {departments.map((deptName) => (
                <option key={deptName} value={deptName}>
                  {deptName}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-md">
        {paginatedData.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Employee</TableHead>
                  <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Department</TableHead>
                  <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Status</TableHead>
                  <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Check In</TableHead>
                  <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Check Out</TableHead>
                  <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Working Hours</TableHead>
                  <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Overtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {paginatedData.map((item) => {
                  const hasRecord = !!item.attendance;
                  const status = item.attendance?.status || (isFutureDate ? 'NOT_MARKED' : 'ABSENT');
                  
                  return (
                    <TableRow key={item.employee.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {item.employee.firstName} {item.employee.lastName}
                            </span>
                            {item.employee.role === 'ADMIN' && (
                              <span className="px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[8px] font-extrabold uppercase tracking-wider">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">
                            {item.employee.employeeCode}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="px-6 py-4">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.employee.department?.name || '—'}
                        </span>
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border',
                            getStatusBadgeStyles(status)
                          )}>
                            {status}
                          </span>
                          
                          {item.attendance?.lateMinutes && item.attendance.lateMinutes > 0 ? (
                            <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                              {item.attendance.lateMinutes}m Late
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4 text-foreground font-medium">
                        {hasRecord ? formatTime12h(item.attendance?.checkIn) : '—'}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-foreground font-medium">
                        {hasRecord ? formatTime12h(item.attendance?.checkOut) : '—'}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-foreground font-medium">
                        {hasRecord ? formatDuration(item.attendance?.workingMinutes || 0) : '—'}
                      </TableCell>

                      <TableCell className="px-6 py-4 text-foreground font-semibold">
                        {hasRecord && item.attendance?.overtimeMinutes && item.attendance.overtimeMinutes > 0 ? (
                          <span className="text-indigo-400 font-bold">
                            {formatDuration(item.attendance.overtimeMinutes)}
                          </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground space-y-3">
            <Users className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold">No records found</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Try adjusting your search query or filter options.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-semibold text-foreground">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>{' '}
            of <span className="font-semibold text-foreground">{totalItems}</span> employees
          </div>
          
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-lg border-border hover:bg-muted cursor-pointer"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1
              ) {
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-semibold cursor-pointer',
                      currentPage === page
                        ? 'bg-indigo-650 hover:bg-indigo-700 text-white border-0 shadow-md'
                        : 'border-border hover:bg-muted'
                    )}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              }
              if (
                (page === 2 && currentPage > 3) ||
                (page === totalPages - 1 && currentPage < totalPages - 2)
              ) {
                return (
                  <span key={page} className="px-1 text-xs text-muted-foreground select-none">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-lg border-border hover:bg-muted cursor-pointer"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
