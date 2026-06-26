'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Calendar as CalendarIcon, 
  Settings, 
  FileText, 
  Download, 
  Plus, 
  Trash2, 
  UserCheck, 
  ShieldAlert, 
  UserMinus, 
  Sparkles,
  Loader2,
  X,
  Building,
  ShieldCheck,
  CalendarRange
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  createShift, 
  updateShift, 
  assignShiftToEmployee, 
  createHoliday, 
  deleteHoliday, 
  approveCorrection, 
  rejectCorrection, 
  addManualAttendance, 
  getAttendanceReport,
  getAdminDashboardStats,
  approveLeave,
  rejectLeave
} from '@/actions/attendance';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  halfDayAfter: string;
  isActive: boolean;
  _count?: { users: number };
}

interface Holiday {
  id: string;
  title: string;
  date: Date | string;
  type: string;
}

interface CorrectionRequest {
  id: string;
  attendanceId: string;
  employeeId: string;
  requestedCheckIn: Date | string | null;
  requestedCheckOut: Date | string | null;
  reason: string;
  status: string;
  managerComment: string | null;
  createdAt: Date | string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    email: string;
  };
  attendance: {
    date: Date | string;
    checkIn: Date | string | null;
    checkOut: Date | string | null;
    status: string;
  };
}

interface DashboardStats {
  totalEmployees: number;
  present: number;
  late: number;
  halfDay: number;
  wfh: number;
  absent: number;
  pendingApprovals: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  shiftId: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface PendingLeaveRequest {
  id: string;
  employeeId: string;
  date: Date | string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string;
  approvalStatus: string;
  remarks: string | null;
  createdAt: Date | string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    email: string;
  };
}

interface AdminAttendanceClientProps {
  initialShifts: Shift[];
  initialHolidays: Holiday[];
  initialCorrections: CorrectionRequest[];
  initialLeaves: PendingLeaveRequest[];
  initialStats: DashboardStats | null;
  employees: Employee[];
  departments: Department[];
  userDisplayName: string;
}

export default function AdminAttendanceClient({
  initialShifts,
  initialHolidays,
  initialCorrections,
  initialLeaves,
  initialStats,
  employees,
  departments,
  userDisplayName
}: AdminAttendanceClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'corrections' | 'manual' | 'shifts' | 'holidays' | 'reports'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(initialStats);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>(initialCorrections);
  const [leaves, setLeaves] = useState<PendingLeaveRequest[]>(initialLeaves);

  // Leave approval states
  const [selectedLeave, setSelectedLeave] = useState<PendingLeaveRequest | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveManagerComment, setLeaveManagerComment] = useState('');
  const [processingLeave, setProcessingLeave] = useState(false);

  useEffect(() => {
    if (selectedLeave) {
      setLeaveModalOpen(true);
    } else {
      setLeaveModalOpen(false);
    }
  }, [selectedLeave]);

  const handleProcessLeave = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedLeave) return;
    setProcessingLeave(true);
    try {
      const res = action === 'APPROVE' 
        ? await approveLeave(selectedLeave.id) 
        : await rejectLeave(selectedLeave.id, leaveManagerComment);

      if (res.success) {
        setLeaves(leaves.filter(l => l.id !== selectedLeave.id));
        setSelectedLeave(null);
        setLeaveManagerComment('');
        toast.success(`Leave request ${action === 'APPROVE' ? 'approved' : 'rejected'}.`);
        refreshDashboardStats();
      } else {
        toast.error(res.error || 'Failed to process leave request.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing leave request.');
    } finally {
      setProcessingLeave(false);
    }
  };
  
  // Shift Form states
  const [newShift, setNewShift] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    halfDayAfter: '10:30',
  });
  const [assigningEmpId, setAssigningEmpId] = useState('');
  const [assigningShiftId, setAssigningShiftId] = useState('');
  const [loadingShiftAction, setLoadingShiftAction] = useState(false);

  // Holiday Form states
  const [newHoliday, setNewHoliday] = useState({
    title: '',
    date: '',
    type: 'National',
  });
  const [holidayDate, setHolidayDate] = useState<Date | undefined>(undefined);
  const [loadingHolidayAction, setLoadingHolidayAction] = useState(false);

  // Manual Attendance Form states
  const [manualRecord, setManualRecord] = useState({
    employeeId: '',
    date: '',
    checkIn: '09:00',
    checkOut: '18:00',
    status: 'PRESENT',
    reason: '',
  });
  const [manualDate, setManualDate] = useState<Date | undefined>(undefined);
  const [loadingManualAction, setLoadingManualAction] = useState(false);

  // Reports states
  const [filters, setFilters] = useState({
    employeeId: '',
    departmentId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: '',
  });
  const [reportRecords, setReportRecords] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Correction Action Modal states
  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionRequest | null>(null);
  const [managerComment, setManagerComment] = useState('');
  const [processingCorrection, setProcessingCorrection] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);

  useEffect(() => {
    if (selectedCorrection) {
      setCorrectionModalOpen(true);
    } else {
      setCorrectionModalOpen(false);
    }
  }, [selectedCorrection]);

  const refreshDashboardStats = async () => {
    try {
      const res = await getAdminDashboardStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Shift Action
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingShiftAction(true);
    try {
      const res = await createShift(newShift);
      if (res.success && res.shift) {
        setShifts([res.shift as Shift, ...shifts]);
        setNewShift({ name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15, halfDayAfter: '10:30' });
        toast.success('Work Shift created successfully.');
      } else {
        toast.error(res.error || 'Failed to create shift.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoadingShiftAction(false);
    }
  };

  // Assign Shift Action
  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEmpId || !assigningShiftId) return;
    setLoadingShiftAction(true);
    try {
      const res = await assignShiftToEmployee(assigningEmpId, assigningShiftId === 'none' ? null : assigningShiftId);
      if (res.success) {
        toast.success('Shift assigned successfully.');
        setAssigningEmpId('');
        setAssigningShiftId('');
      } else {
        toast.error(res.error || 'Failed to assign shift.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoadingShiftAction(false);
    }
  };

  // Create Holiday Action
  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.date) {
      toast.error('Please pick a date for the holiday.');
      return;
    }
    setLoadingHolidayAction(true);
    try {
      const res = await createHoliday(newHoliday);
      if (res.success && res.holiday) {
        setHolidays([...holidays, res.holiday as Holiday].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setNewHoliday({ title: '', date: '', type: 'National' });
        setHolidayDate(undefined);
        toast.success('Holiday created successfully.');
      } else {
        toast.error(res.error || 'Failed to create holiday.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoadingHolidayAction(false);
    }
  };

  // Delete Holiday Action
  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to remove this holiday?')) return;
    try {
      const res = await deleteHoliday(id);
      if (res.success) {
        setHolidays(holidays.filter(h => h.id !== id));
        toast.success('Holiday removed successfully.');
      } else {
        toast.error(res.error || 'Failed to delete holiday.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    }
  };

  // Process Correction Action (Approve / Reject)
  const handleProcessCorrection = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedCorrection) return;
    setProcessingCorrection(true);
    try {
      const res = action === 'APPROVE' 
        ? await approveCorrection(selectedCorrection.id, managerComment)
        : await rejectCorrection(selectedCorrection.id, managerComment);

      if (res.success) {
        setCorrections(corrections.filter(c => c.id !== selectedCorrection.id));
        setSelectedCorrection(null);
        setManagerComment('');
        toast.success(`Correction request ${action === 'APPROVE' ? 'approved' : 'rejected'}.`);
        refreshDashboardStats();
      } else {
        toast.error(res.error || 'Failed to process correction.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setProcessingCorrection(false);
    }
  };

  // Manual Attendance Action
  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRecord.date) {
      toast.error('Please pick a date.');
      return;
    }
    setLoadingManualAction(true);
    try {
      const isWorkingStatus = ['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(manualRecord.status);
      const submitData = {
        ...manualRecord,
        checkIn: isWorkingStatus ? manualRecord.checkIn : null,
        checkOut: isWorkingStatus ? manualRecord.checkOut : null,
      };

      const res = await addManualAttendance(submitData);
      if (res.success) {
        toast.success('Attendance record saved successfully.');
        setManualRecord({ employeeId: '', date: '', checkIn: '09:00', checkOut: '18:00', status: 'PRESENT', reason: '' });
        setManualDate(undefined);
        refreshDashboardStats();
      } else {
        toast.error(res.error || 'Failed to save attendance record.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoadingManualAction(false);
    }
  };

  // Fetch Report Action
  const handleFetchReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingReport(true);
    try {
      const res = await getAttendanceReport(filters);
      if (res.success && res.records) {
        setReportRecords(res.records);
        if (res.records.length === 0) {
          toast.info('No attendance records found matching filters.');
        } else {
          toast.success(`Found ${res.records.length} records.`);
        }
      } else {
        toast.error(res.error || 'Failed to generate report.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoadingReport(false);
    }
  };

  // Export to CSV Action
  const handleExportCSV = () => {
    if (reportRecords.length === 0) {
      toast.warning('No data to export. Please run filter query first.');
      return;
    }

    const headers = ['Date', 'Employee Name', 'Code', 'Department', 'Check In', 'Check Out', 'Working Time (Hours)', 'Late (Minutes)', 'Overtime (Minutes)', 'Status'];
    const rows = reportRecords.map(r => [
      new Date(r.date).toLocaleDateString(),
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.employee.employeeCode,
      r.employee.department?.name || 'N/A',
      r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
      r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
      r.workingMinutes ? (r.workingMinutes / 60).toFixed(2) : '0.00',
      r.lateMinutes.toString(),
      r.overtimeMinutes.toString(),
      r.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${filters.month}_${filters.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV successfully!');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/10 to-card/50 border border-border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            Attendance Administration <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage shifts, holidays, correction requests, manual updates and generate reports
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-px overflow-x-auto">
        {(['overview', 'corrections', 'manual', 'shifts', 'holidays', 'reports'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-xl ${
              activeTab === tab ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : ''
            }`}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* TABS CONTAINER */}
      <div className="space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              
              <Card className="shadow-md hover:border-indigo-500/20 transition group">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Staff</span>
                  <p className="text-2xl font-black text-foreground mt-2">{stats?.totalEmployees ?? 0}</p>
                  <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Active staff list</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:border-emerald-500/20 transition group">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Present Today</span>
                  <p className="text-2xl font-black text-foreground mt-2">{stats?.present ?? 0}</p>
                  <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Checked-in today</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:border-yellow-500/20 transition group">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">Late Arrivals</span>
                  <p className="text-2xl font-black text-foreground mt-2">{stats?.late ?? 0}</p>
                  <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-500 animate-bounce" />
                    <span>Late arrivals today</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:border-rose-500/20 transition group">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Absent Today</span>
                  <p className="text-2xl font-black text-foreground mt-2">{stats?.absent ?? 0}</p>
                  <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
                    <UserMinus className="w-3.5 h-3.5 text-rose-500" />
                    <span>Missing check-ins</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:border-indigo-500/20 transition group col-span-2 md:col-span-1">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Pending Approvals</span>
                  <p className="text-2xl font-black text-foreground mt-2">{stats?.pendingApprovals ?? 0}</p>
                  <div className="flex items-center text-[10px] text-muted-foreground mt-4 gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span>Corrections pending</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="border border-border rounded-3xl p-6 shadow-md bg-card/50">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-indigo-400" /> Real-time System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The metrics above display today's records on a real-time basis. You can check the details of corrections raised in the <strong className="text-indigo-400">Corrections</strong> tab or execute manual operations under the <strong className="text-indigo-400">Manual</strong> or <strong className="text-indigo-400">Shifts</strong> panels.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: CORRECTION REQUESTS */}
        {activeTab === 'corrections' && (
          <>
            <Card className="border border-border rounded-3xl shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-foreground">Pending Attendance Corrections</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Approve or reject employee requests for check-in/out hour corrections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {corrections.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl space-y-3 flex flex-col items-center">
                  <ShieldCheck className="w-12 h-12 text-indigo-500/45" />
                  <p className="text-sm font-semibold">No pending corrections found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-2xl">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Employee</TableHead>
                        <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Date</TableHead>
                        <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Current Entry</TableHead>
                        <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Requested Entry</TableHead>
                        <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Reason</TableHead>
                        <TableHead className="px-6 py-4 text-right font-bold uppercase text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {corrections.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="font-bold text-foreground">
                              {req.employee.firstName} {req.employee.lastName}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">
                              {req.employee.employeeCode}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 font-medium">
                            {new Date(req.attendance.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="font-mono text-muted-foreground text-[11px]">
                              IN: {req.attendance.checkIn ? new Date(req.attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                            <div className="font-mono text-muted-foreground text-[11px] mt-0.5">
                              OUT: {req.attendance.checkOut ? new Date(req.attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="font-mono text-indigo-400 text-[11px] font-bold">
                              IN: {req.requestedCheckIn ? new Date(req.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                            <div className="font-mono text-indigo-400 text-[11px] font-bold mt-0.5">
                              OUT: {req.requestedCheckOut ? new Date(req.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 max-w-[200px] truncate" title={req.reason}>
                            {req.reason}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Button
                              onClick={() => setSelectedCorrection(req)}
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                            >
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border rounded-3xl shadow-md mt-8 bg-card/60 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-rose-500" />
                Pending Leave Requests
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Approve or reject employee requests for leaves on specific days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {leaves.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl space-y-3 flex flex-col items-center bg-background/20">
                  <CheckCircle className="w-12 h-12 text-rose-500/40" />
                  <p className="text-sm font-semibold text-muted-foreground">No pending leave requests found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-2xl">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Employee</TableHead>
                        <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Requested Date</TableHead>
                        <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Leave Reason / Remarks</TableHead>
                        <TableHead className="px-6 py-4 text-right font-bold uppercase text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="font-bold text-foreground">
                              {req.employee.firstName} {req.employee.lastName}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">
                              {req.employee.employeeCode}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 font-semibold text-foreground">
                            {new Date(req.date).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell className="px-6 py-4 max-w-[250px] truncate font-medium text-foreground" title={req.remarks || ''}>
                            {req.remarks || 'No reason provided'}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Button
                              onClick={() => setSelectedLeave(req)}
                              size="sm"
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer rounded-xl"
                            >
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </>
        )}

        {/* TAB 3: MANUAL ATTENDANCE */}
        {activeTab === 'manual' && (
          <Card className="border border-border rounded-3xl p-6 shadow-md max-w-2xl">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-lg font-bold text-foreground">Manual Attendance Logger</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Log or overwrite attendance records manually for audits or overrides</CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <form onSubmit={handleManualAttendance} className="space-y-4">
                
                {/* Employee & Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="manualEmp" className="text-xs font-semibold text-muted-foreground">
                      Select Employee
                    </Label>
                    <Select
                      value={manualRecord.employeeId}
                      onValueChange={(val) => setManualRecord({ ...manualRecord, employeeId: val || '' })}
                    >
                      <SelectTrigger id="manualEmp" className="w-full bg-background border border-border text-xs">
                        <SelectValue placeholder="-- Choose Employee --" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="manualStatus" className="text-xs font-semibold text-muted-foreground">
                      Attendance Status
                    </Label>
                    <Select
                      value={manualRecord.status}
                      onValueChange={(val) => setManualRecord({ ...manualRecord, status: val || 'PRESENT' })}
                    >
                      <SelectTrigger id="manualStatus" className="w-full bg-background border border-border text-xs">
                        <SelectValue placeholder="Choose Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRESENT">Present</SelectItem>
                        <SelectItem value="ABSENT">Absent (Mark absent)</SelectItem>
                        <SelectItem value="LATE">Late Arrival</SelectItem>
                        <SelectItem value="HALF_DAY">Half Day</SelectItem>
                        <SelectItem value="WORK_FROM_HOME">Work From Home (WFH)</SelectItem>
                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                        <SelectItem value="HOLIDAY">Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  {/* Date Select (Popover + Calendar) */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal text-xs border border-border bg-background",
                            !manualDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {manualDate ? format(manualDate, "PPP") : <span>Pick Date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={manualDate}
                          onSelect={(date) => {
                            setManualDate(date);
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');
                              setManualRecord({ ...manualRecord, date: `${yyyy}-${mm}-${dd}` });
                            } else {
                              setManualRecord({ ...manualRecord, date: '' });
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mCheckIn" className="text-xs font-semibold text-muted-foreground">
                      Check In Time
                    </Label>
                    <Input
                      id="mCheckIn"
                      type="time"
                      disabled={!['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(manualRecord.status)}
                      required={['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(manualRecord.status)}
                      value={manualRecord.checkIn}
                      onChange={(e) => setManualRecord({ ...manualRecord, checkIn: e.target.value })}
                      className="w-full text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mCheckOut" className="text-xs font-semibold text-muted-foreground">
                      Check Out Time
                    </Label>
                    <Input
                      id="mCheckOut"
                      type="time"
                      disabled={!['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(manualRecord.status)}
                      required={['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(manualRecord.status)}
                      value={manualRecord.checkOut}
                      onChange={(e) => setManualRecord({ ...manualRecord, checkOut: e.target.value })}
                      className="w-full text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mReason" className="text-xs font-semibold text-muted-foreground">
                    Override/Insert Reason
                  </Label>
                  <Textarea
                    id="mReason"
                    required
                    rows={3}
                    placeholder="Explain why you are manually overriding/inserting this record..."
                    value={manualRecord.reason}
                    onChange={(e) => setManualRecord({ ...manualRecord, reason: e.target.value })}
                    className="w-full text-xs resize-none rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loadingManualAction}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer rounded-xl flex items-center gap-2"
                >
                  {loadingManualAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  Save Log Record
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: SHIFTS MANAGEMENT */}
        {activeTab === 'shifts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Shifts list */}
            <Card className="lg:col-span-2 border border-border rounded-3xl shadow-md p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="text-lg font-bold text-foreground">Work Shifts</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Manage active shifts and grace settings</CardDescription>
              </CardHeader>

              <CardContent className="p-0 space-y-4">
                {shifts.map((shift) => (
                  <div key={shift.id} className="p-4 bg-background/50 border border-border/60 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{shift.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Timing: {shift.startTime} - {shift.endTime} | Grace: {shift.graceMinutes} min | Half-Day After: {shift.halfDayAfter}
                      </p>
                    </div>
                    <div className="text-xs font-extrabold uppercase bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                      {shift._count?.users ?? 0} Employees Assigned
                    </div>
                  </div>
                ))}
              </CardContent>

              {/* Assign Shift Form */}
              <div className="pt-6 border-t border-border/40 mt-6 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <UserCheck className="w-4.5 h-4.5 text-indigo-400" /> Assign Shift to Employee
                </h3>
                <form onSubmit={handleAssignShift} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="assignEmp" className="text-xs font-semibold text-muted-foreground">
                      Employee
                    </Label>
                    <Select
                      value={assigningEmpId}
                      onValueChange={(val) => setAssigningEmpId(val || '')}
                    >
                      <SelectTrigger id="assignEmp" className="w-full bg-background border border-border text-xs">
                        <SelectValue placeholder="-- Choose Employee --" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="assignShift" className="text-xs font-semibold text-muted-foreground">
                      Work Shift
                    </Label>
                    <Select
                      value={assigningShiftId}
                      onValueChange={(val) => setAssigningShiftId(val || '')}
                    >
                      <SelectTrigger id="assignShift" className="w-full bg-background border border-border text-xs">
                        <SelectValue placeholder="-- Choose Shift --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Default General)</SelectItem>
                        {shifts.map(shift => (
                          <SelectItem key={shift.id} value={shift.id}>{shift.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={loadingShiftAction}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer rounded-xl flex items-center justify-center gap-2"
                  >
                    {loadingShiftAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Assign Shift
                  </Button>
                </form>
              </div>
            </Card>
            
            {/* Create Shift Form */}
            <Card className="border border-border rounded-3xl shadow-md p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-bold text-foreground">Create Work Shift</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleCreateShift} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sName" className="text-xs font-semibold text-muted-foreground">
                      Shift Name
                    </Label>
                    <Input
                      id="sName"
                      type="text"
                      required
                      placeholder="e.g. Night Shift, Morning"
                      value={newShift.name}
                      onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                      className="w-full text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="sStart" className="text-xs font-semibold text-muted-foreground">
                        Start Time
                      </Label>
                      <Input
                        id="sStart"
                        type="time"
                        required
                        value={newShift.startTime}
                        onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="sEnd" className="text-xs font-semibold text-muted-foreground">
                        End Time
                      </Label>
                      <Input
                        id="sEnd"
                        type="time"
                        required
                        value={newShift.endTime}
                        onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="sGrace" className="text-xs font-semibold text-muted-foreground">
                        Grace (Minutes)
                      </Label>
                      <Input
                        id="sGrace"
                        type="number"
                        required
                        min={0}
                        value={newShift.graceMinutes}
                        onChange={(e) => setNewShift({ ...newShift, graceMinutes: parseInt(e.target.value) || 0 })}
                        className="w-full text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="sHalfDay" className="text-xs font-semibold text-muted-foreground">
                        Half-Day After
                      </Label>
                      <Input
                        id="sHalfDay"
                        type="time"
                        required
                        value={newShift.halfDayAfter}
                        onChange={(e) => setNewShift({ ...newShift, halfDayAfter: e.target.value })}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loadingShiftAction}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer rounded-xl flex items-center justify-center gap-2"
                  >
                    {loadingShiftAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Shift
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 5: HOLIDAYS */}
        {activeTab === 'holidays' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Holidays list */}
            <Card className="lg:col-span-2 border border-border rounded-3xl shadow-md p-6">
              <CardHeader className="p-0 pb-6">
                <CardTitle className="text-lg font-bold text-foreground">Holidays Calendar</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Manage holidays and non-working events</CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                {holidays.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2">
                    <CalendarIcon className="w-10 h-10 text-indigo-500/40" />
                    <p className="text-xs font-semibold">No holidays created yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {holidays.map((holiday) => (
                      <div key={holiday.id} className="p-4 bg-background/50 border border-border/60 rounded-2xl flex justify-between items-center hover:border-indigo-500/10 transition-colors group">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">{holiday.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Date: {new Date(holiday.date).toLocaleDateString()} | Type: {holiday.type}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Create Holiday Form */}
            <Card className="border border-border rounded-3xl shadow-md p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-bold text-foreground">Add Holiday</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleCreateHoliday} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="hTitle" className="text-xs font-semibold text-muted-foreground">
                      Holiday Title
                    </Label>
                    <Input
                      id="hTitle"
                      type="text"
                      required
                      placeholder="e.g. Independence Day"
                      value={newHoliday.title}
                      onChange={(e) => setNewHoliday({ ...newHoliday, title: e.target.value })}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Holiday Date Selector */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal text-xs border border-border bg-background",
                            !holidayDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {holidayDate ? format(holidayDate, "PPP") : <span>Pick Date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={holidayDate}
                          onSelect={(date) => {
                            setHolidayDate(date);
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');
                              setNewHoliday({ ...newHoliday, date: `${yyyy}-${mm}-${dd}` });
                            } else {
                              setNewHoliday({ ...newHoliday, date: '' });
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Holiday Type Select */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="hType" className="text-xs font-semibold text-muted-foreground">
                      Type
                    </Label>
                    <Select
                      value={newHoliday.type}
                      onValueChange={(val) => setNewHoliday({ ...newHoliday, type: val || 'National' })}
                    >
                      <SelectTrigger id="hType" className="w-full bg-background border border-border text-xs">
                        <SelectValue placeholder="Choose Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="National">National Holiday</SelectItem>
                        <SelectItem value="Festival">Festival</SelectItem>
                        <SelectItem value="Restricted">Restricted Holiday</SelectItem>
                        <SelectItem value="Optional">Optional Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={loadingHolidayAction}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer rounded-xl flex items-center justify-center gap-2"
                  >
                    {loadingHolidayAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Holiday
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 6: REPORTS & EXPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            
            {/* Filter controls */}
            <Card className="border border-border rounded-3xl p-6 shadow-md">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold text-foreground">Exportable Attendance Reports</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleFetchReport} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                  
                  {/* Select Employee */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="repEmp" className="text-xs font-semibold text-muted-foreground">Employee</Label>
                    <Select
                      value={filters.employeeId}
                      onValueChange={(val) => setFilters({ ...filters, employeeId: val || '' })}
                    >
                      <SelectTrigger id="repEmp" className="w-full bg-background border border-border text-xs">
                        <SelectValue placeholder="All Employees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Employees</SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select Department */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="repDept" className="text-xs font-semibold text-muted-foreground">Department</Label>
                    <Select
                      value={filters.departmentId}
                      onValueChange={(val) => setFilters({ ...filters, departmentId: val || '' })}
                    >
                      <SelectTrigger id="repDept" className="w-full bg-background border border-border text-xs">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select Month */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="repMonth" className="text-xs font-semibold text-muted-foreground">Month</Label>
                    <Select
                      value={filters.month.toString()}
                      onValueChange={(val) => setFilters({ ...filters, month: parseInt(val || '1') || 1 })}
                    >
                      <SelectTrigger id="repMonth" className="w-full bg-background border border-border text-xs">
                        <SelectValue placeholder="Choose Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, idx) => (
                          <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                            {new Date(0, idx).toLocaleDateString([], { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select Year */}
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="repYear" className="text-xs font-semibold text-muted-foreground">Year</Label>
                    <Select
                      value={filters.year.toString()}
                      onValueChange={(val) => setFilters({ ...filters, year: parseInt(val || '2026') || 2026 })}
                    >
                      <SelectTrigger id="repYear" className="w-full bg-background border border-border text-xs">
                        <SelectValue placeholder="Choose Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2027">2027</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={loadingReport}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer rounded-xl flex items-center justify-center gap-2"
                  >
                    {loadingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    Filter Records
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Records list */}
            {reportRecords.length > 0 && (
              <Card className="border border-border rounded-3xl p-6 shadow-md">
                <CardHeader className="p-0 pb-4 flex flex-row justify-between items-center">
                  <CardTitle className="text-sm font-bold text-foreground">Query Result ({reportRecords.length} records)</CardTitle>
                  <Button
                    onClick={handleExportCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/10"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </Button>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto border border-border rounded-2xl">
                    <Table className="text-xs">
                      <TableHeader className="bg-muted">
                        <TableRow>
                          <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Employee</TableHead>
                          <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Date</TableHead>
                          <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Timings</TableHead>
                          <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Working Time</TableHead>
                          <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Late / Overtime</TableHead>
                          <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Status</TableHead>
                          <TableHead className="px-6 py-4 text-right font-bold uppercase text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportRecords.map((r) => (
                          <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="px-6 py-4">
                              <div className="font-bold text-foreground">
                                {r.employee.firstName} {r.employee.lastName}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">
                                {r.employee.employeeCode} | {r.employee.department?.name || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 font-semibold">
                              {new Date(r.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="font-mono text-muted-foreground text-[11px]">
                                IN: {r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </div>
                              <div className="font-mono text-muted-foreground text-[11px] mt-0.5">
                                OUT: {r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 font-semibold">
                              {r.workingMinutes 
                                ? `${Math.floor(r.workingMinutes / 60)}h ${r.workingMinutes % 60}m` 
                                : '--'}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="text-yellow-400 font-semibold">{r.lateMinutes > 0 ? `Late: ${r.lateMinutes} min` : '--'}</div>
                              <div className="text-emerald-400 font-semibold mt-0.5">{r.overtimeMinutes > 0 ? `OT: ${r.overtimeMinutes} min` : '--'}</div>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase border ${
                                r.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                r.status === 'LATE' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                r.status === 'HALF_DAY' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                r.status === 'ON_LEAVE' || r.status === 'LEAVE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                r.status === 'HOLIDAY' ? 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' :
                                'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {r.status}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <Button
                                onClick={() => {
                                  // Pre-fill manual form and switch tab
                                  setManualRecord({
                                    employeeId: r.employeeId,
                                    date: new Date(r.date).toISOString().split('T')[0],
                                    checkIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '09:00',
                                    checkOut: r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '18:00',
                                    status: r.status,
                                    reason: `Override of existing entry from ${new Date(r.date).toLocaleDateString()}`,
                                  });
                                  setManualDate(new Date(r.date));
                                  setActiveTab('manual');
                                }}
                                size="sm"
                                variant="outline"
                                className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-bold rounded-xl cursor-pointer"
                              >
                                Override
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* REVIEW CORRECTION REQUEST MODAL DIALOG */}
      <Dialog open={correctionModalOpen} onOpenChange={(open) => { if (!open) setSelectedCorrection(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border border-border rounded-3xl p-6 gap-5">
          <DialogHeader className="border-b border-border/40 pb-3">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-indigo-400 animate-spin-slow" />
              Review Attendance Correction
            </DialogTitle>
          </DialogHeader>

          {selectedCorrection && (
            <div className="space-y-4">
              {/* Employee Details Card */}
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border/60">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-extrabold">
                  {selectedCorrection.employee.firstName?.[0]}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    {selectedCorrection.employee.firstName} {selectedCorrection.employee.lastName}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    Code: {selectedCorrection.employee.employeeCode} | Email: {selectedCorrection.employee.email}
                  </p>
                </div>
              </div>

              {/* Compare Timings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                    Original Entry
                  </span>
                  <div className="text-xs font-semibold text-foreground font-mono">
                    IN: {selectedCorrection.attendance.checkIn ? new Date(selectedCorrection.attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>
                  <div className="text-xs font-semibold text-foreground font-mono mt-0.5">
                    OUT: {selectedCorrection.attendance.checkOut ? new Date(selectedCorrection.attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>
                </div>

                <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                    Requested Entry
                  </span>
                  <div className="text-xs font-bold text-indigo-300 font-mono">
                    IN: {selectedCorrection.requestedCheckIn ? new Date(selectedCorrection.requestedCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>
                  <div className="text-xs font-bold text-indigo-300 font-mono mt-0.5">
                    OUT: {selectedCorrection.requestedCheckOut ? new Date(selectedCorrection.requestedCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                  Reason for correction
                </span>
                <p className="text-xs text-foreground font-medium italic">
                  "{selectedCorrection.reason}"
                </p>
              </div>

              {/* Comment Field */}
              <div className="space-y-1.5">
                <Label htmlFor="mComments" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Manager Comments / Remarks
                </Label>
                <Textarea
                  id="mComments"
                  rows={2}
                  placeholder="Enter approval/rejection remarks here..."
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  className="w-full text-xs font-medium resize-none rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-4 pt-3 bg-transparent border-t border-border/30">
            <Button
              type="button"
              variant="destructive"
              disabled={processingCorrection}
              onClick={() => handleProcessCorrection('REJECT')}
              className="w-1/2 rounded-xl cursor-pointer"
            >
              Reject Correction
            </Button>
            <Button
              type="button"
              disabled={processingCorrection}
              onClick={() => handleProcessCorrection('APPROVE')}
              className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/15 border-transparent"
            >
              {processingCorrection ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : null}
              Approve Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REVIEW LEAVE REQUEST MODAL DIALOG */}
      <Dialog open={leaveModalOpen} onOpenChange={(open) => { if (!open) setSelectedLeave(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border border-border rounded-3xl p-6 gap-5">
          <DialogHeader className="border-b border-border/40 pb-3">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-rose-500" />
              Review Leave Request
            </DialogTitle>
          </DialogHeader>

          {selectedLeave && (
            <div className="space-y-4">
              {/* Employee Details Card */}
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-2xl border border-border/60">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 font-extrabold">
                  {selectedLeave.employee.firstName?.[0]}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    {selectedLeave.employee.firstName} {selectedLeave.employee.lastName}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    Code: {selectedLeave.employee.employeeCode} | Email: {selectedLeave.employee.email}
                  </p>
                </div>
              </div>

              {/* Requested Date */}
              <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-1">
                  Requested Date
                </span>
                <div className="text-xs font-bold text-rose-350">
                  {new Date(selectedLeave.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Leave Reason */}
              <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                  Reason for leave request
                </span>
                <p className="text-xs text-foreground font-medium italic">
                  "{selectedLeave.remarks || 'No reason provided'}"
                </p>
              </div>

              {/* Comment Field */}
              <div className="space-y-1.5">
                <Label htmlFor="lComments" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Manager Comments / Remarks (Optional)
                </Label>
                <Textarea
                  id="lComments"
                  rows={2}
                  placeholder="Enter approval/rejection remarks here..."
                  value={leaveManagerComment}
                  onChange={(e) => setLeaveManagerComment(e.target.value)}
                  className="w-full text-xs font-medium resize-none rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-4 pt-3 bg-transparent border-t border-border/30">
            <Button
              type="button"
              variant="destructive"
              disabled={processingLeave}
              onClick={() => handleProcessLeave('REJECT')}
              className="w-1/2 rounded-xl cursor-pointer"
            >
              Reject Leave
            </Button>
            <Button
              type="button"
              disabled={processingLeave}
              onClick={() => handleProcessLeave('APPROVE')}
              className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-500/15 border-transparent"
            >
              {processingLeave ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : null}
              Approve Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
