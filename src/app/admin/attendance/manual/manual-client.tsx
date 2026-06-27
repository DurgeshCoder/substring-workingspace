'use client';

import React, { useState } from 'react';
import { 
  UserCheck, 
  Loader2, 
  Calendar as CalendarIcon
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manual Attendance Logger</h1>
        <p className="text-xs text-muted-foreground">
          Log or override attendance records manually for audits or overrides.
        </p>
      </div>

      <Card className="border border-border rounded-3xl p-6 shadow-md max-w-2xl bg-card">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="text-lg font-bold text-foreground">Manual Logger Form</CardTitle>
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
                  <SelectTrigger id="manualEmp" className="w-full bg-background border border-border text-xs rounded-xl">
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
                  <SelectTrigger id="manualStatus" className="w-full bg-background border border-border text-xs rounded-xl">
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
                        "w-full justify-start text-left font-normal text-xs border border-border bg-background rounded-xl",
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
                  className="w-full text-xs rounded-xl"
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
                  className="w-full text-xs rounded-xl"
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
    </div>
  );
}
