'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  AlertCircle, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Monitor, 
  Globe, 
  Sparkles,
  Info,
  Send,
  Loader2,
  CalendarDays,
  ShieldCheck,
  UserCheck,
  CalendarRange
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  checkIn, 
  checkOut, 
  getEmployeeCalendar, 
  getEmployeeStats, 
  raiseCorrection,
  requestLeave
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

interface AttendanceRecord {
  id: string;
  date: Date | string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string;
  workingMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  ipAddress?: string | null;
  device?: string | null;
  browser?: string | null;
  approvalStatus: string;
  approvedById?: string | null;
  approvedAt?: Date | string | null;
  remarks?: string | null;
}

interface Holiday {
  id: string;
  title: string;
  date: Date | string;
  type: string;
}

interface Stats {
  attendancePercentage: number;
  presentDays: number;
  lateCount: number;
  halfDays: number;
  pendingCorrections: number;
  totalHours: number;
  leaveDays: number;
}

interface AttendanceClientProps {
  initialTodayRecord: AttendanceRecord | null;
  initialStats: Stats | null;
  userDisplayName: string;
  userId: string;
}

const formatTime12h = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '--:--';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '--:--';
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // mapping 0 to 12
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  const hoursStr = hours < 10 ? `0${hours}` : hours;
  return `${hoursStr}:${minutesStr} ${ampm}`;
};

const getLocalDateString = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    if (dateInput.includes('T00:00:00') || (dateInput.endsWith('.000Z') && date.getUTCHours() === 0)) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  if (dateInput instanceof Date || typeof dateInput === 'object') {
    const isMidnightUTC = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
    if (isMidnightUTC) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalDateString = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const isMidnightUTC = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  if (isMidnightUTC) {
    const weekday = days[date.getUTCDay()];
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  } else {
    const weekday = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  }
};

export default function AttendanceClient({
  initialTodayRecord,
  initialStats,
  userDisplayName,
  userId
}: AttendanceClientProps) {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(initialTodayRecord);
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);
  
  // Navigation states for calendar
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [calendarRecords, setCalendarRecords] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  
  // Selection states
  const [selectedDayRecord, setSelectedDayRecord] = useState<{
    date: Date;
    record: AttendanceRecord | null;
    holiday: Holiday | null;
    isWeekend: boolean;
  } | null>(null);
  
  // Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  
  // Loading states
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [fetchingCalendar, setFetchingCalendar] = useState(false);
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  
  // Device and GPS states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [ipAddress, setIpAddress] = useState<string>('127.0.0.1');
  const [browser, setBrowser] = useState<string>('Unknown Browser');
  const [device, setDevice] = useState<string>('Desktop');
  const [address, setAddress] = useState<string>('Remote Workspace');
  
  // Correction Form states
  const [requestedCheckIn, setRequestedCheckIn] = useState('09:00');
  const [requestedCheckOut, setRequestedCheckOut] = useState('18:00');
  const [correctionReason, setCorrectionReason] = useState('');

  // 1. Clock Ticker
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Device Info and Geolocation on mount
  useEffect(() => {
    // Detect Browser
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown Browser';
    if (userAgent.includes('Firefox')) browserName = 'Mozilla Firefox';
    else if (userAgent.includes('SamsungBrowser')) browserName = 'Samsung Browser';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browserName = 'Opera';
    else if (userAgent.includes('Trident')) browserName = 'Internet Explorer';
    else if (userAgent.includes('Edge')) browserName = 'Microsoft Edge';
    else if (userAgent.includes('Chrome')) browserName = 'Google Chrome';
    else if (userAgent.includes('Safari')) browserName = 'Apple Safari';
    setBrowser(browserName);

    // Detect Device type
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    setDevice(isMobile ? 'Mobile' : 'Desktop');

    // Fetch IP Address
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('127.0.0.1'));

    // Fetch Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setAddress(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => {
          console.warn('Geolocation denied or unavailable:', error.message);
        }
      );
    }
  }, []);

  // 3. Fetch Calendar Records when Month/Year navigation occurs
  const fetchCalendarData = async () => {
    setFetchingCalendar(true);
    try {
      const res = await getEmployeeCalendar(month, year);
      if (res.success && res.attendances && res.holidays) {
        setCalendarRecords(res.attendances as unknown as AttendanceRecord[]);
        setHolidays(res.holidays as unknown as Holiday[]);
      } else {
        toast.error(res.error || 'Failed to fetch calendar data.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred while loading the calendar.');
    } finally {
      setFetchingCalendar(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [month, year]);

  // Helper: Refresh dashboard statistics
  const refreshStats = async () => {
    try {
      const statsRes = await getEmployeeStats();
      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Handle Check In
  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await checkIn({
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address,
        ipAddress,
        device,
        browser,
      });

      if (res.success && res.record) {
        setTodayRecord(res.record as unknown as AttendanceRecord);
        toast.success('Successfully checked in!');
        fetchCalendarData();
        refreshStats();
      } else {
        toast.error(res.error || 'Failed to check in.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Check In failed.');
    } finally {
      setCheckingIn(false);
    }
  };

  // 5. Handle Check Out
  const handleCheckOut = async () => {
    if (!todayRecord) return;
    setCheckingOut(true);
    try {
      const res = await checkOut(todayRecord.id);
      if (res.success && res.record) {
        setTodayRecord(res.record as unknown as AttendanceRecord);
        toast.success('Successfully checked out!');
        fetchCalendarData();
        refreshStats();
      } else {
        toast.error(res.error || 'Failed to check out.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Check Out failed.');
    } finally {
      setCheckingOut(false);
    }
  };

  // 6. Handle Raise Correction
  const handleRaiseCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayRecord) return;
    setSubmittingCorrection(true);
    try {
      const target = selectedDayRecord.record 
        ? selectedDayRecord.record.id 
        : { date: getLocalDateString(selectedDayRecord.date) };

      const res = await raiseCorrection(target, {
        requestedCheckIn,
        requestedCheckOut,
        reason: correctionReason,
      });

      if (res.success) {
        toast.success('Attendance correction request submitted to manager.');
        setCorrectionModalOpen(false);
        setCorrectionReason('');
        setSelectedDayRecord(null); 
        setDetailModalOpen(false);
        fetchCalendarData();
        refreshStats();
      } else {
        toast.error(res.error || 'Failed to raise correction.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit correction.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // 7. Handle Request Leave
  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayRecord) return;
    setSubmittingLeave(true);
    try {
      const dateStr = getLocalDateString(selectedDayRecord.date);
      const res = await requestLeave(dateStr, leaveReason);

      if (res.success) {
        toast.success('Leave request submitted to manager for approval.');
        setLeaveModalOpen(false);
        setLeaveReason('');
        setSelectedDayRecord(null); 
        setDetailModalOpen(false);
        fetchCalendarData();
        refreshStats();
      } else {
        toast.error(res.error || 'Failed to submit leave request.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit leave request.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // 7. Calendar rendering logic
  const getDaysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => {
    const firstDay = new Date(y, m - 1, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const daysCount = getDaysInMonth(month, year);
  const startOffset = getFirstDayOfMonth(month, year);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Map calendar grid days
  const calendarDays = [];
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push(null);
  }

  for (let d = 1; d <= daysCount; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = getLocalDateString(date);

    const record = calendarRecords.find(r => {
      const recordDateStr = getLocalDateString(r.date);
      return recordDateStr === dateStr;
    }) || null;

    const holiday = holidays.find(h => {
      const holidayDateStr = getLocalDateString(h.date);
      return holidayDateStr === dateStr;
    }) || null;

    const isWeekend = date.getDay() === 0;

    calendarDays.push({
      day: d,
      date,
      record,
      holiday,
      isWeekend,
    });
  }

  // Get status color coding
  const getStatusClasses = (dayObj: any) => {
    if (!dayObj) return 'bg-transparent text-transparent border-transparent cursor-default pointer-events-none';
    
    const { record, holiday, isWeekend } = dayObj;
    
    if (record) {
      const status = record.status.toUpperCase();
      if (status === 'PRESENT') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'LATE') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'HALF_DAY') return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'ON_LEAVE' || status === 'LEAVE') return 'bg-red-500/10 text-red-650 dark:text-red-450 border-red-500/20 hover:bg-red-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'HOLIDAY') return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20 hover:scale-[1.02] shadow-sm';
      if (status === 'WEEKEND') return 'bg-slate-500/5 text-slate-600 dark:text-slate-400 border-slate-500/10 hover:bg-slate-500/10 hover:scale-[1.02]';
      if (status === 'ABSENT') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20 hover:scale-[1.02] shadow-sm';
      return 'bg-card border-border hover:bg-muted hover:scale-[1.02]';
    }

    if (holiday) {
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20 hover:scale-[1.02] shadow-sm';
    }

    if (isWeekend) {
      return 'bg-slate-500/5 text-slate-600 dark:text-slate-400 border-slate-500/10 hover:bg-slate-500/10 hover:scale-[1.02]';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dayObj.date < today) {
      return 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-dashed border-gray-300 dark:border-gray-800 hover:bg-gray-500/15 hover:scale-[1.02] shadow-sm';
    }

    return 'bg-card border-border hover:bg-muted hover:scale-[1.02] text-muted-foreground';
  };

  const getStatusLabel = (dayObj: any) => {
    if (!dayObj) return '';
    const { record, holiday, isWeekend } = dayObj;
    if (record) {
      if (record.status === 'PRESENT') return 'Present';
      if (record.status === 'LATE') return 'Late';
      if (record.status === 'HALF_DAY') return 'Half Day';
      if (record.status === 'ON_LEAVE' || record.status === 'LEAVE') {
        return record.approvalStatus === 'PENDING' ? 'Leave (P)' : 'Leave';
      }
      if (record.status === 'HOLIDAY') return 'Holiday';
      if (record.status === 'WEEKEND') return 'Weekend';
      if (record.status === 'ABSENT') return 'Absent';
    }
    if (holiday) return 'Holiday';
    if (isWeekend) return 'Weekend';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dayObj.date < today) return 'Not Marked';
    
    return '-';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* 1. Header Greeting & Real-time clock */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/10 to-card/50 border border-border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            Good Morning, {userDisplayName}! <Sparkles className="w-5 h-5 text-fuchsia-400 animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-sm">
            Attendance Dashboard & Work Shift Management
          </p>
        </div>
        
        {/* Real-time Clock */}
        <div className="flex items-center gap-4 bg-background/50 border border-border/80 px-6 py-3 rounded-2xl shadow-inner z-10">
          <Clock className="w-5 h-5 text-indigo-400 animate-spin-slow" />
          <div className="flex flex-col">
            <span className="font-mono text-lg font-black text-foreground tabular-nums tracking-wide">
              {mounted 
                ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                : '--:--:--'}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest text-right">
              {mounted 
                ? currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) 
                : 'Loading Date...'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Check In / Check Out Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Check In Action Card */}
        <Card className="lg:col-span-2 bg-card/60 backdrop-blur-sm border border-border/80 rounded-3xl flex flex-col justify-between min-h-[300px] relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500" />
          
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div>
              <CardTitle className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${todayRecord ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                Today's Status: {todayRecord ? todayRecord.status : 'NOT CHECKED IN'}
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Shift: General (09:00 AM - 06:00 PM)
            </span>
          </CardHeader>

          <CardContent className="space-y-6 my-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-background/40 border border-border/60 rounded-2xl shadow-inner flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Check In</p>
                  <p className="text-sm font-bold text-foreground">
                    {formatTime12h(todayRecord?.checkIn)}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-background/40 border border-border/60 rounded-2xl shadow-inner flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Check Out</p>
                  <p className="text-sm font-bold text-foreground">
                    {formatTime12h(todayRecord?.checkOut)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-4 items-center bg-transparent border-t border-border/30 pt-4">
            {!todayRecord ? (
              <Button
                onClick={handleCheckIn}
                disabled={checkingIn}
                size="lg"
                className="w-full sm:w-auto px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/15"
              >
                {checkingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                Check In Today
              </Button>
            ) : !todayRecord.checkOut ? (
              <Button
                onClick={handleCheckOut}
                disabled={checkingOut}
                variant="destructive"
                size="lg"
                className="w-full sm:w-auto px-8 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-500/15"
              >
                {checkingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                Check Out Today
              </Button>
            ) : (
              <div className="w-full flex items-center gap-3 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-400">
                  Great work today! Attendance checklist completed.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground ml-auto bg-background/25 px-3 py-1.5 rounded-lg border border-border/40">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
              <span>Location Verified ({latitude ? 'GPS OK' : 'IP-Based'})</span>
            </div>
          </CardFooter>
        </Card>

        {/* Client System Details Card */}
        <Card className="bg-card border border-border rounded-3xl shadow-md flex flex-col justify-between p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              Connection Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-3.5">
            <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
              <span className="text-muted-foreground flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> IP Address</span>
              <span className="font-mono font-semibold text-foreground">{ipAddress}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
              <span className="text-muted-foreground flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Browser</span>
              <span className="font-semibold text-foreground">{browser}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
              <span className="text-muted-foreground flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Device</span>
              <span className="font-semibold text-foreground">{device}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Address</span>
              <span className="font-semibold text-foreground truncate max-w-[150px]">{address}</span>
            </div>
          </CardContent>
          <CardFooter className="p-0 pt-4 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-2 bg-transparent">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>Secure check-ins verified by server IP tracker.</span>
          </CardFooter>
        </Card>
      </div>

      {/* 3. Monthly Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-border rounded-2xl shadow-md hover:border-indigo-500/20 transition-all duration-200 group">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Attendance</span>
              <p className="text-3xl font-black text-foreground group-hover:scale-105 transition-transform duration-200 origin-left">
                {stats ? `${stats.attendancePercentage}%` : '--'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border rounded-2xl shadow-md hover:border-indigo-500/20 transition-all duration-200 group">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Late / Half Days</span>
              <p className="text-3xl font-black text-foreground group-hover:scale-105 transition-transform duration-200 origin-left">
                {stats ? `${stats.lateCount} / ${stats.halfDays}` : '--'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-500 flex items-center justify-center text-white shadow-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border rounded-2xl shadow-md hover:border-indigo-500/20 transition-all duration-200 group">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leaves Taken</span>
              <p className="text-3xl font-black text-foreground group-hover:scale-105 transition-transform duration-200 origin-left">
                {stats ? `${stats.leaveDays} days` : '--'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-sky-500 flex items-center justify-center text-white shadow-lg">
              <CalendarDays className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border rounded-2xl shadow-md hover:border-indigo-500/20 transition-all duration-200 group">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Work Hours</span>
              <p className="text-3xl font-black text-foreground group-hover:scale-105 transition-transform duration-200 origin-left">
                {stats ? `${stats.totalHours} hrs` : '--'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Calendar Matrix Grid */}
      <Card className="border border-border rounded-3xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Attendance Calendar</h2>
              <p className="text-xs text-muted-foreground">Click on any date to view detailed records or raise corrections</p>
            </div>
          </div>

          {/* Calendar Month Selector */}
          <div className="flex items-center bg-background/80 border border-border/80 rounded-xl p-1 shadow-inner self-stretch sm:self-auto">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={prevMonth}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-4 font-extrabold text-sm text-foreground text-center flex-1 sm:flex-initial min-w-[100px]">
              {monthNames[month - 1]} {year}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={nextMonth}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-bold text-muted-foreground mb-3 border-b border-border/40 pb-2">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span className="text-indigo-400/80">Sat</span>
          <span className="text-indigo-400/80">Sun</span>
        </div>

        {/* Day matrices */}
        {fetchingCalendar ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-sm font-semibold">Loading calendar logs...</span>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2.5">
            {calendarDays.map((dayObj, index) => {
              if (!dayObj) return <div key={`offset-${index}`} className="aspect-square" />;
              
              const statusClass = getStatusClasses(dayObj);
              const label = getStatusLabel(dayObj);
              
              return (
                <button
                  key={`day-${dayObj.day}`}
                  onClick={() => {
                    setSelectedDayRecord(dayObj);
                    setDetailModalOpen(true);
                  }}
                  className={`aspect-square border rounded-2xl flex flex-col justify-between p-2.5 text-xs font-semibold cursor-pointer transition-all duration-200 outline-none select-none relative ${statusClass}`}
                >
                  <span className="text-xs font-bold">{dayObj.day}</span>
                  <span className="text-[10px] font-extrabold uppercase mt-auto tracking-wider bg-background/30 px-1.5 py-0.5 rounded-md backdrop-blur-[2px]">
                    {label}
                  </span>
                  {dayObj.holiday && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-400" title={dayObj.holiday.title} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-border/40 flex flex-wrap gap-x-6 gap-y-3 justify-center text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/30" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-rose-500/10 border border-rose-500/30" />
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500/10 border border-red-500/30" />
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-500/10 border border-amber-500/30" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-orange-500/10 border border-orange-500/30" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-violet-500/10 border border-violet-500/30" />
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-slate-500/5 border border-slate-500/20" />
            <span>Weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-gray-500/10 border border-dashed border-gray-500/30" />
            <span>Not Marked</span>
          </div>
        </div>
      </Card>

      {/* 5. POPUP DIALOG - DAY SPECIFIC DETAILS */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border rounded-3xl p-6 gap-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground">
              Attendance Log Detail
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground mt-0.5">
              {formatLocalDateString(selectedDayRecord?.date)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 bg-background/50 border border-border/60 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Status</span>
                <span className="text-xs font-bold text-foreground">
                  {selectedDayRecord?.record ? (
                    selectedDayRecord.record.status === 'ON_LEAVE' || selectedDayRecord.record.status === 'LEAVE'
                      ? `LEAVE (${selectedDayRecord.record.approvalStatus})`
                      : selectedDayRecord.record.status
                  ) : (
                    selectedDayRecord?.holiday ? 'HOLIDAY' : (
                      selectedDayRecord?.isWeekend ? 'WEEKEND' : (
                        selectedDayRecord && new Date(selectedDayRecord.date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
                          ? 'ATTENDANCE NOT MARKED'
                          : 'ABSENT'
                      )
                    )
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Working Time</span>
                <span className="text-xs font-bold text-foreground">
                  {selectedDayRecord?.record && selectedDayRecord.record.workingMinutes > 0 
                    ? `${Math.floor(selectedDayRecord.record.workingMinutes / 60)}h ${selectedDayRecord.record.workingMinutes % 60}m` 
                    : '--'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Check In</span>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {formatTime12h(selectedDayRecord?.record?.checkIn)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Check Out</span>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {formatTime12h(selectedDayRecord?.record?.checkOut)}
                </span>
              </div>
              {selectedDayRecord?.record?.remarks && (
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Remarks</span>
                  <span className="text-xs text-foreground font-medium">{selectedDayRecord.record.remarks}</span>
                </div>
              )}
              {selectedDayRecord?.holiday && (
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Holiday Title</span>
                  <span className="text-xs text-neutral-400 font-bold">{selectedDayRecord.holiday.title} ({selectedDayRecord.holiday.type})</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between items-center gap-4 bg-transparent border-t border-border/30 pt-4">
            {selectedDayRecord && (selectedDayRecord.record || (new Date(selectedDayRecord.date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0) && !selectedDayRecord.holiday && !selectedDayRecord.isWeekend)) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRequestedCheckIn(
                    selectedDayRecord.record?.checkIn 
                      ? new Date(selectedDayRecord.record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
                      : '09:00'
                  );
                  setRequestedCheckOut(
                    selectedDayRecord.record?.checkOut 
                      ? new Date(selectedDayRecord.record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
                      : '18:00'
                  );
                  setCorrectionModalOpen(true);
                }}
                className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-bold rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <CalendarRange className="w-4 h-4" />
                {selectedDayRecord.record ? 'Raise Correction' : 'Request Attendance'}
              </Button>
            )}

            {selectedDayRecord && !selectedDayRecord.record && !selectedDayRecord.holiday && !selectedDayRecord.isWeekend && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLeaveReason('');
                  setLeaveModalOpen(true);
                }}
                className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 font-bold rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <CalendarDays className="w-4 h-4" />
                Request Leave
              </Button>
            )}
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDetailModalOpen(false)}
              className="rounded-xl cursor-pointer ml-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. CORRECTION SUBMIT MODAL DIALOG */}
      <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border rounded-3xl p-6 gap-5">
          <DialogHeader className="border-b border-border/40 pb-3">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-fuchsia-400" />
              Raise Attendance Correction
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRaiseCorrection} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reqCheckIn" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Correct Check In
                </Label>
                <Input
                  id="reqCheckIn"
                  type="time"
                  required
                  value={requestedCheckIn}
                  onChange={(e) => setRequestedCheckIn(e.target.value)}
                  className="w-full text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reqCheckOut" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Correct Check Out
                </Label>
                <Input
                  id="reqCheckOut"
                  type="time"
                  required
                  value={requestedCheckOut}
                  onChange={(e) => setRequestedCheckOut(e.target.value)}
                  className="w-full text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Correction Reason
              </Label>
              <Textarea
                id="reason"
                required
                rows={3}
                placeholder="Explain why you are raising this correction (e.g. forgot checkout, field work)..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full text-xs font-medium resize-none rounded-xl"
              />
            </div>

            <DialogFooter className="flex gap-4 pt-3 bg-transparent border-t border-border/30">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCorrectionModalOpen(false)}
                className="w-1/2 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingCorrection}
                className="w-1/2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:opacity-90 transition text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-fuchsia-500/10 border-transparent"
              >
                {submittingCorrection ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Submit Correction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. LEAVE REQUEST MODAL DIALOG */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
      <DialogContent className="sm:max-w-md bg-card border border-border rounded-3xl p-6 gap-5">
        <DialogHeader className="border-b border-border/40 pb-3">
          <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4.5 h-4.5 text-rose-500" />
            Apply For Leave
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground mt-0.5">
            {formatLocalDateString(selectedDayRecord?.date)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRequestLeave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="leaveReason" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
              Leave Reason / Remarks
            </Label>
            <Textarea
              id="leaveReason"
              required
              rows={4}
              placeholder="Please provide a reason for applying leave on this specific day..."
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="w-full text-xs font-medium resize-none rounded-xl"
            />
          </div>

          <DialogFooter className="flex gap-4 pt-3 bg-transparent border-t border-border/30">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLeaveModalOpen(false)}
              className="w-1/2 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submittingLeave}
              className="w-1/2 bg-gradient-to-r from-rose-500 to-red-650 hover:opacity-90 transition text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-500/10 border-transparent"
            >
              {submittingLeave ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </div>
  );
}
