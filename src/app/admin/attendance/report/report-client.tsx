'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Loader2, 
  LayoutList,
  Calendar as CalendarIcon,
  Clock,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { getAttendanceReport, addManualAttendance } from '@/actions/attendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  formatTime12h, 
  formatTime24h, 
  getLocalDateString, 
  formatLocalDateString 
} from '../shared-helpers';

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

interface Holiday {
  id: string;
  title: string;
  date: Date | string;
  type: string;
}

interface ReportClientProps {
  employees: Employee[];
  departments: Department[];
  initialHolidays: Holiday[];
}

export default function ReportClient({ employees, departments, initialHolidays }: ReportClientProps) {
  const [holidays] = useState<Holiday[]>(initialHolidays);
  const [reportRecords, setReportRecords] = useState<any[]>([]);
  const [reportViewMode, setReportViewMode] = useState<'table' | 'calendar'>('table');
  const [loadingReport, setLoadingReport] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: '',
    departmentId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: '',
  });

  // Manual Override Modal states (when clicking Calendar cells or Override buttons)
  const [selectedDayOverride, setSelectedDayOverride] = useState<any>(null);
  const [overrideForm, setOverrideForm] = useState({
    employeeId: '',
    date: '',
    checkIn: '09:00',
    checkOut: '18:00',
    status: 'PRESENT',
    reason: '',
  });
  const [loadingOverride, setLoadingOverride] = useState(false);

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
      r.checkIn ? formatTime12h(r.checkIn) : '--',
      r.checkOut ? formatTime12h(r.checkOut) : '--',
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

  const getReportSummary = () => {
    const present = reportRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const halfDay = reportRecords.filter(r => r.status === 'HALF_DAY').length;
    const leave = reportRecords.filter(r => r.status === 'ON_LEAVE' || r.status === 'LEAVE').length;
    const absent = reportRecords.filter(r => r.status === 'ABSENT').length;
    
    let notMarked = 0;
    if (filters.employeeId) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      let endDay = new Date(filters.year, filters.month, 0).getDate();
      if (filters.year === currentYear && filters.month === currentMonth) {
        endDay = today.getDate();
      }
      
      for (let d = 1; d <= endDay; d++) {
        const checkDate = new Date(Date.UTC(filters.year, filters.month - 1, d));
        const isWeekend = checkDate.getUTCDay() === 0; // Sunday is the only weekend
        
        const dateStr = `${filters.year}-${String(filters.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        const hasRecord = reportRecords.some(r => {
          const rDate = new Date(r.date);
          const rYear = rDate.getUTCFullYear();
          const rMonth = String(rDate.getUTCMonth() + 1).padStart(2, '0');
          const rDay = String(rDate.getUTCDate()).padStart(2, '0');
          const rDateStr = `${rYear}-${rMonth}-${rDay}`;
          return rDateStr === dateStr;
        });
        
        const hasHoliday = holidays.some(h => {
          const hDate = new Date(h.date);
          const hYear = hDate.getUTCFullYear();
          const hMonth = String(hDate.getUTCMonth() + 1).padStart(2, '0');
          const hDay = String(hDate.getUTCDate()).padStart(2, '0');
          const hDateStr = `${hYear}-${hMonth}-${hDay}`;
          return hDateStr === dateStr;
        });
        
        if (!isWeekend && !hasHoliday) {
          if (!hasRecord) {
            notMarked++;
          }
        }
      }
    }
    
    return { present, halfDay, leave, absent, notMarked };
  };

  const getDaysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => {
    const firstDay = new Date(y, m - 1, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const renderAdminReportCalendar = () => {
    const m = filters.month;
    const y = filters.year;
    const daysCount = getDaysInMonth(m, y);
    const startOffset = getFirstDayOfMonth(m, y);
    
    const calendarDays = [];
    for (let i = 0; i < startOffset; i++) {
      calendarDays.push(null);
    }
    
    for (let d = 1; d <= daysCount; d++) {
      const date = new Date(Date.UTC(y, m - 1, d));
      const dateStr = getLocalDateString(date);
      
      const record = reportRecords.find(r => {
        const recordDateStr = getLocalDateString(r.date);
        return recordDateStr === dateStr;
      }) || null;
      
      const holiday = holidays.find(h => {
        const holidayDateStr = getLocalDateString(h.date);
        return holidayDateStr === dateStr;
      }) || null;
      
      const isWeekend = date.getUTCDay() === 0; // Sunday only
      
      calendarDays.push({
        day: d,
        date,
        record,
        holiday,
        isWeekend,
      });
    }
    
    return calendarDays;
  };

  const getReportStatusClasses = (dayObj: any) => {
    if (!dayObj) return 'bg-transparent text-transparent border-transparent cursor-default pointer-events-none';
    
    const { record, holiday, isWeekend } = dayObj;
    
    if (record) {
      const status = record.status.toUpperCase();
      if (status === 'PRESENT') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'LATE') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'HALF_DAY') return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'ON_LEAVE' || status === 'LEAVE') return 'bg-red-500/10 text-red-655 dark:text-red-450 border-red-500/20 hover:bg-red-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'HOLIDAY') return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'WEEKEND') return 'bg-slate-500/5 text-slate-650 dark:text-slate-400 border-slate-500/10 hover:bg-slate-500/10 hover:scale-[1.02]';
      if (status === 'ABSENT') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20 hover:scale-[1.02] shadow-sm';
      return 'bg-card border-border hover:bg-muted hover:scale-[1.02]';
    }

    if (holiday) {
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20 hover:scale-[1.02] shadow-sm';
    }

    if (isWeekend) {
      return 'bg-slate-500/5 text-slate-550 dark:text-slate-455 border-slate-500/10 hover:bg-slate-500/10 hover:scale-[1.02]';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(dayObj.date);
    compareDate.setHours(0, 0, 0, 0);
    if (compareDate < today) {
      return 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-dashed border-gray-300 dark:border-gray-800 hover:bg-gray-500/15 hover:scale-[1.02] shadow-sm';
    }

    return 'bg-card border-border hover:bg-muted hover:scale-[1.02] text-muted-foreground';
  };

  const getReportStatusLabel = (dayObj: any) => {
    if (!dayObj) return '';
    const { record, holiday, isWeekend } = dayObj;
    if (record) {
      if (record.status === 'PRESENT') return 'Present';
      if (record.status === 'LATE') return 'Late';
      if (record.status === 'HALF_DAY') return 'Half Day';
      if (record.status === 'ON_LEAVE' || record.status === 'LEAVE') return 'Leave';
      if (record.status === 'HOLIDAY') return 'Holiday';
      if (record.status === 'WEEKEND') return 'Weekend';
      if (record.status === 'ABSENT') return 'Absent';
    }
    if (holiday) return 'Holiday';
    if (isWeekend) return 'Weekend';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(dayObj.date);
    compareDate.setHours(0, 0, 0, 0);
    if (compareDate < today) return 'Not Marked';
    
    return '';
  };

  const handleOpenOverride = (dayObj: any) => {
    const dateStr = getLocalDateString(dayObj.date);
    const checkInTime = formatTime24h(dayObj.record?.checkIn);
    const checkOutTime = dayObj.record?.checkOut 
      ? formatTime24h(dayObj.record.checkOut) 
      : '18:00';

    setOverrideForm({
      employeeId: filters.employeeId,
      date: dateStr,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      status: dayObj.record?.status || (dayObj.holiday ? 'HOLIDAY' : (dayObj.isWeekend ? 'ABSENT' : 'PRESENT')),
      reason: dayObj.record 
        ? `Override of existing entry from ${dateStr}` 
        : `Manual record entry for ${dateStr}`,
    });
    setSelectedDayOverride(dayObj);
  };

  const handleOpenTableOverride = (record: any) => {
    setOverrideForm({
      employeeId: record.employeeId,
      date: getLocalDateString(record.date),
      checkIn: formatTime24h(record.checkIn),
      checkOut: record.checkOut ? formatTime24h(record.checkOut) : '18:00',
      status: record.status,
      reason: `Override of existing entry from ${getLocalDateString(record.date)}`,
    });
    setSelectedDayOverride({ date: new Date(record.date), record });
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingOverride(true);
    try {
      const isWorkingStatus = ['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(overrideForm.status);
      const submitData = {
        ...overrideForm,
        checkIn: isWorkingStatus ? overrideForm.checkIn : null,
        checkOut: isWorkingStatus ? overrideForm.checkOut : null,
      };

      const res = await addManualAttendance(submitData);
      if (res.success) {
        toast.success('Attendance record updated.');
        // Refresh report query results locally
        const updatedRecords = reportRecords.map(r => {
          if (getLocalDateString(r.date) === overrideForm.date && r.employeeId === overrideForm.employeeId) {
            return {
              ...r,
              checkIn: isWorkingStatus ? new Date(`${overrideForm.date}T${overrideForm.checkIn}:00`) : null,
              checkOut: isWorkingStatus ? new Date(`${overrideForm.date}T${overrideForm.checkOut}:00`) : null,
              status: overrideForm.status,
            };
          }
          return r;
        });
        setReportRecords(updatedRecords);
        setSelectedDayOverride(null);
      } else {
        toast.error(res.error || 'Failed to update record.');
      }
    } catch (err) {
      toast.error('An error occurred while saving.');
    } finally {
      setLoadingOverride(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Reports</h1>
        <p className="text-xs text-muted-foreground">
          View custom timesheet queries, toggle calendar grid overview, and export CSV timesheets.
        </p>
      </div>

      {/* Filter controls */}
      <Card className="border border-border bg-card rounded-3xl p-6 shadow-md">
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
                <SelectTrigger id="repEmp" className="w-full bg-background border border-border text-xs rounded-xl">
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
                <SelectTrigger id="repDept" className="w-full bg-background border border-border text-xs rounded-xl">
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
                <SelectTrigger id="repMonth" className="w-full bg-background border border-border text-xs rounded-xl">
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
                <SelectTrigger id="repYear" className="w-full bg-background border border-border text-xs rounded-xl">
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
        <div className="space-y-6">
          
          {/* Report Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-md bg-indigo-950/10 border border-indigo-500/20 rounded-2xl p-5 flex items-center justify-between group">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Total Present Days</span>
                <p className="text-2xl font-black text-foreground mt-1.5">{getReportSummary().present} Days</p>
                {getReportSummary().halfDay > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">Includes {getReportSummary().halfDay} Half-Days</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            </Card>

            <Card className="shadow-md bg-red-950/10 border border-red-500/20 rounded-2xl p-5 flex items-center justify-between group">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Total Leaves Taken</span>
                <p className="text-2xl font-black text-foreground mt-1.5">{getReportSummary().leave} Days</p>
                <p className="text-[10px] text-muted-foreground mt-1">Approved & pending leaves</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                <CalendarIcon className="w-5 h-5" />
              </div>
            </Card>

            <Card className="shadow-md bg-gray-950/10 border border-gray-500/20 rounded-2xl p-5 flex items-center justify-between group">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Days Not Marked</span>
                <p className="text-2xl font-black text-foreground mt-1.5">
                  {filters.employeeId ? `${getReportSummary().notMarked} Days` : '--'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {filters.employeeId ? 'Unmarked weekdays this month' : 'Select an employee to view'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center text-gray-400">
                <Clock className="w-5 h-5" />
              </div>
            </Card>
          </div>

          <Card className="border border-border rounded-3xl p-6 shadow-md bg-card">
            <CardHeader className="p-0 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <CardTitle className="text-sm font-bold text-foreground">Query Result ({reportRecords.length} records)</CardTitle>
                {filters.employeeId && (
                  <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40 w-fit">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setReportViewMode('table')}
                      className={`h-7 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        reportViewMode === 'table' 
                          ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-600 hover:text-white' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <LayoutList className="w-3 h-3 mr-1.5" />
                      Table View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setReportViewMode('calendar')}
                      className={`h-7 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        reportViewMode === 'calendar' 
                          ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-600 hover:text-white' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <CalendarIcon className="w-3 h-3 mr-1.5" />
                      Calendar View
                    </Button>
                  </div>
                )}
              </div>
              <Button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/10 self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {reportViewMode === 'calendar' && filters.employeeId ? (
                <div className="space-y-6">
                  {/* Days of week header */}
                  <div className="grid grid-cols-7 gap-3 text-center text-[10px] font-black uppercase text-muted-foreground tracking-wider pb-2 border-b border-border/40">
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                    <div className="text-rose-400">Sun</div>
                  </div>

                  {/* Calendar Grid Cells */}
                  <div className="grid grid-cols-7 gap-3">
                    {renderAdminReportCalendar().map((dayObj, index) => {
                      if (!dayObj) {
                        return <div key={`report-offset-${index}`} className="aspect-square bg-muted/5 border border-transparent rounded-2xl opacity-20" />;
                      }

                      const statusClass = getReportStatusClasses(dayObj);
                      const label = getReportStatusLabel(dayObj);
                      const dateStr = getLocalDateString(dayObj.date);

                      return (
                        <button
                          key={`report-day-${dayObj.day}`}
                          type="button"
                          onClick={() => handleOpenOverride(dayObj)}
                          className={`aspect-square border rounded-2xl flex flex-col justify-between p-3 text-xs font-semibold cursor-pointer transition-all duration-200 outline-none select-none relative group/cell hover:border-indigo-500/40 hover:shadow-lg hover:-translate-y-0.5 ${statusClass}`}
                          title={dayObj.holiday ? `Holiday: ${dayObj.holiday.title}` : `Click to override/set attendance for ${dateStr}`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="text-sm font-black tracking-tight">{dayObj.day}</span>
                            {dayObj.holiday && (
                              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" title={dayObj.holiday.title} />
                            )}
                          </div>

                          <div className="my-auto text-left w-full overflow-hidden">
                            {dayObj.holiday ? (
                              <p className="text-[9px] font-bold text-violet-400 truncate tracking-wide" title={dayObj.holiday.title}>
                                {dayObj.holiday.title}
                              </p>
                            ) : dayObj.record ? (
                              <div className="space-y-0.5 font-mono text-[9px] text-muted-foreground/90 opacity-80 group-hover/cell:opacity-100 transition-opacity">
                                {dayObj.record.checkIn ? (
                                  <p className="truncate">
                                    IN: <span className="font-extrabold">{formatTime12h(dayObj.record.checkIn)}</span>
                                  </p>
                                ) : (
                                  <p className="truncate">IN: --:--</p>
                                )}
                                {dayObj.record.checkOut ? (
                                  <p className="truncate">
                                    OUT: <span className="font-extrabold">{formatTime12h(dayObj.record.checkOut)}</span>
                                  </p>
                                ) : (
                                  <p className="truncate">OUT: --:--</p>
                                )}
                              </div>
                            ) : dayObj.isWeekend ? (
                              <p className="text-[9px] font-extrabold text-slate-500/80 italic tracking-wide">
                                Weekend
                              </p>
                            ) : (
                              <p className="text-[9px] font-bold text-gray-500/80 italic tracking-wide">
                                Not Marked
                              </p>
                            )}
                          </div>

                          <div className="w-full flex justify-between items-center mt-auto">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-background/40 px-1.5 py-0.5 rounded-md backdrop-blur-[2px] border border-white/5">
                              {label}
                            </span>
                            <span className="text-[8px] opacity-0 group-hover/cell:opacity-100 transition-opacity text-indigo-400 font-extrabold">
                              Edit &rarr;
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-border/40 flex flex-wrap gap-x-6 gap-y-3 justify-center text-[10px] uppercase font-black text-muted-foreground tracking-wider">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30" />
                      <span>Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30" />
                      <span>Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-lg bg-red-500/10 border border-red-500/30" />
                      <span>Leave</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30" />
                      <span>Late</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-lg bg-orange-500/10 border border-orange-500/30" />
                      <span>Half Day</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-lg bg-violet-500/10 border border-violet-500/30" />
                      <span>Holiday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-lg bg-slate-500/5 border border-slate-500/20" />
                      <span>Weekend (Sun)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-lg bg-gray-500/10 border border-dashed border-gray-500/30" />
                      <span>Not Marked</span>
                    </div>
                  </div>
                </div>
              ) : (
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
                            {formatLocalDateString(r.date)}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="font-mono text-muted-foreground text-[11px]">
                              IN: {r.checkIn ? formatTime12h(r.checkIn) : '--:--'}
                            </div>
                            <div className="font-mono text-muted-foreground text-[11px] mt-0.5">
                              OUT: {r.checkOut ? formatTime12h(r.checkOut) : '--:--'}
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
                              onClick={() => handleOpenOverride(r)}
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
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* OVERRIDE RECORD MODAL DIALOG */}
      <Dialog open={!!selectedDayOverride} onOpenChange={(open) => { if (!open) setSelectedDayOverride(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border border-border rounded-3xl p-6 gap-5">
          <DialogHeader className="border-b border-border/40 pb-3">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              Override Attendance Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manually overwrite or insert attendance logs for Date: <span className="font-semibold text-foreground">{overrideForm.date}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveOverride} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ovStatus" className="text-xs font-semibold text-muted-foreground">Attendance Status</Label>
                <Select
                  value={overrideForm.status}
                  onValueChange={(val) => setOverrideForm({ ...overrideForm, status: val || 'PRESENT' })}
                >
                  <SelectTrigger id="ovStatus" className="w-full bg-background border border-border text-xs rounded-xl">
                    <SelectValue placeholder="Choose Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                    <SelectItem value="WORK_FROM_HOME">Work From Home (WFH)</SelectItem>
                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                    <SelectItem value="HOLIDAY">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-xs font-semibold text-muted-foreground">Date</Label>
                <Input disabled value={overrideForm.date} className="text-xs rounded-xl bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ovCheckIn" className="text-xs font-semibold text-muted-foreground">Check In Time</Label>
                <Input
                  id="ovCheckIn"
                  type="time"
                  disabled={!['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(overrideForm.status)}
                  required={['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(overrideForm.status)}
                  value={overrideForm.checkIn}
                  onChange={(e) => setOverrideForm({ ...overrideForm, checkIn: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ovCheckOut" className="text-xs font-semibold text-muted-foreground">Check Out Time</Label>
                <Input
                  id="ovCheckOut"
                  type="time"
                  disabled={!['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(overrideForm.status)}
                  required={['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(overrideForm.status)}
                  value={overrideForm.checkOut}
                  onChange={(e) => setOverrideForm({ ...overrideForm, checkOut: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ovReason" className="text-xs font-semibold text-muted-foreground">Reason / Audit Trail Remarks</Label>
              <Textarea
                id="ovReason"
                required
                rows={2}
                placeholder="Reason for manual override entry..."
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                className="text-xs rounded-xl resize-none"
              />
            </div>

            <DialogFooter className="flex gap-4 pt-3 bg-transparent border-t border-border/30">
              <Button type="button" variant="outline" onClick={() => setSelectedDayOverride(null)} className="w-1/2 rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loadingOverride}
                className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {loadingOverride ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Confirm Override
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
