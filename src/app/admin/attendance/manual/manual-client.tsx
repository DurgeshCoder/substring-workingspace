'use client';

import React, { useState } from 'react';
import { 
  UserCheck, 
  Loader2, 
  Calendar as CalendarIcon,
  ShieldAlert,
  Info,
  Clock,
  Briefcase,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { addManualAttendance } from '@/actions/attendance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

interface ManualClientProps {
  employees: Employee[];
  departments: Department[];
}

export default function ManualClient({ employees }: ManualClientProps) {
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
      } else {
        toast.error(res.error || 'Failed to save attendance record.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoadingManualAction(false);
    }
  };

  const isWorking = ['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(manualRecord.status);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manual Attendance Logger</h1>
        <p className="text-xs text-muted-foreground">
          Log, insert, or override employee daily attendance records directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Form Column */}
        <Card className="lg:col-span-2 border border-border/80 rounded-3xl p-6 shadow-xl bg-card/60 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
          
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              Manual Logger Form
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Manually overwrite or insert employee attendance logs. All actions will trigger audit trail entries.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={handleManualAttendance} className="space-y-6">
              
              {/* Employee & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="manualEmp" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    Select Employee
                  </Label>
                  <Select
                    value={manualRecord.employeeId}
                    onValueChange={(val) => setManualRecord({ ...manualRecord, employeeId: val || '' })}
                  >
                    <SelectTrigger id="manualEmp" className="w-full bg-background border-border hover:border-indigo-500/20 text-xs rounded-xl h-10 transition">
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

                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="manualStatus" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    Attendance Status
                  </Label>
                  <Select
                    value={manualRecord.status}
                    onValueChange={(val) => setManualRecord({ ...manualRecord, status: val || 'PRESENT' })}
                  >
                    <SelectTrigger id="manualStatus" className="w-full bg-background border-border hover:border-indigo-500/20 text-xs rounded-xl h-10 transition">
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

              {/* Date & Timings Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end bg-background/30 p-4 border border-border/40 rounded-2xl">
                
                {/* Date Select (Popover + Calendar) */}
                <div className="space-y-2 flex flex-col">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs border border-border bg-background rounded-xl h-10 transition",
                          !manualDate && "text-muted-foreground"
                        )}
                      >
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

                <div className="space-y-2">
                  <Label htmlFor="mCheckIn" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Check In Time
                  </Label>
                  <Input
                    id="mCheckIn"
                    type="time"
                    disabled={!isWorking}
                    required={isWorking}
                    value={manualRecord.checkIn}
                    onChange={(e) => setManualRecord({ ...manualRecord, checkIn: e.target.value })}
                    className="w-full text-xs rounded-xl h-10 bg-background disabled:opacity-50 transition"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mCheckOut" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Check Out Time
                  </Label>
                  <Input
                    id="mCheckOut"
                    type="time"
                    disabled={!isWorking}
                    required={isWorking}
                    value={manualRecord.checkOut}
                    onChange={(e) => setManualRecord({ ...manualRecord, checkOut: e.target.value })}
                    className="w-full text-xs rounded-xl h-10 bg-background disabled:opacity-50 transition"
                  />
                </div>
              </div>

              {/* Override Reason */}
              <div className="space-y-2">
                <Label htmlFor="mReason" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Override/Insert Reason
                </Label>
                <Textarea
                  id="mReason"
                  required
                  rows={4}
                  placeholder="Explain why you are manually overriding/inserting this record..."
                  value={manualRecord.reason}
                  onChange={(e) => setManualRecord({ ...manualRecord, reason: e.target.value })}
                  className="w-full text-xs resize-none rounded-2xl p-4 bg-background border border-border focus-visible:ring-indigo-500/20"
                />
              </div>

              <Button
                type="submit"
                disabled={loadingManualAction}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer rounded-2xl flex items-center justify-center gap-2 h-12 w-full sm:w-auto px-6 transition duration-200 shadow-md shadow-indigo-600/10"
              >
                {loadingManualAction ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <UserCheck className="w-4.5 h-4.5" />
                )}
                Save Log Record
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Guidelines / Help Card */}
        <div className="space-y-6">
          <Card className="border border-border/80 rounded-3xl p-6 shadow-lg bg-card">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-4.5 h-4.5 text-amber-500" />
                Audit Trail Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-xs text-muted-foreground leading-relaxed space-y-3">
              <p>
                All manually created or modified attendance entries are permanently tagged as <span className="text-amber-400 font-semibold">"Overridden"</span> in reports.
              </p>
              <p>
                The audit trail logs the Administrator's name, timestamp, IP address, and the stated reason. Ensure that the reason matches valid internal logs/tickets.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/80 rounded-3xl p-6 shadow-lg bg-card">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Info className="w-4.5 h-4.5 text-indigo-400" />
                Quick Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-xs text-muted-foreground leading-relaxed space-y-3">
              <div className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong>Working Statuses</strong> (Present, Late, Half Day, WFH) require valid clock timings.</span>
              </div>
              <div className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong>Leave / Holiday / Absent</strong> statuses automatically clear clock-in/out timings.</span>
              </div>
              <div className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>Overrides replace the employee's checkout & break duration records for the target day.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
