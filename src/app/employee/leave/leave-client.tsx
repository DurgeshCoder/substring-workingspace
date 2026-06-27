'use client';

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle,
  FileText,
  AlertCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { requestLeave, cancelLeaveRequest } from '@/actions/attendance';
import { formatShortLocalDateString } from '../../admin/attendance/shared-helpers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LeaveRequest {
  id: string;
  date: string;
  status: string;
  approvalStatus: string;
  remarks: string | null;
  createdAt: string;
}

interface Holiday {
  id: string;
  title: string;
  date: string;
}

interface LeaveClientProps {
  initialLeaves: LeaveRequest[];
  holidays: Holiday[];
}

export default function LeaveClient({ initialLeaves, holidays }: LeaveClientProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaves);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Form states for requesting a new leave
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState<Date | undefined>(undefined);
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Cancellation state
  const [leaveToCancel, setLeaveToCancel] = useState<LeaveRequest | null>(null);
  const [cancellingLeaveId, setCancellingLeaveId] = useState<string | null>(null);

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate) {
      toast.error('Please pick a leave date.');
      return;
    }
    if (!leaveReason.trim()) {
      toast.error('Please provide a reason for the leave.');
      return;
    }

    setSubmittingLeave(true);
    try {
      const yyyy = leaveDate.getFullYear();
      const mm = String(leaveDate.getMonth() + 1).padStart(2, '0');
      const dd = String(leaveDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const res = await requestLeave(dateStr, leaveReason);
      if (res.success) {
        toast.success('Leave request submitted to manager.');
        // Add new pending leave locally
        const newReq: LeaveRequest = {
          id: Math.random().toString(), // fallback temp ID, page refresh will load actual
          date: new Date(leaveDate.getTime() + 24*60*60*1000).toISOString(), // rough date approximation
          status: 'ON_LEAVE',
          approvalStatus: 'PENDING',
          remarks: leaveReason,
          createdAt: new Date().toISOString()
        };
        setLeaves([newReq, ...leaves]);
        setLeaveDate(undefined);
        setLeaveReason('');
        setRequestModalOpen(false);
      } else {
        toast.error(res.error || 'Failed to submit leave request.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const confirmCancelLeave = async () => {
    if (!leaveToCancel) return;
    setCancellingLeaveId(leaveToCancel.id);
    try {
      const res = await cancelLeaveRequest(leaveToCancel.id);
      if (res.success) {
        setLeaves(leaves.filter(l => l.id !== leaveToCancel.id));
        toast.success('Leave request cancelled successfully.');
      } else {
        toast.error(res.error || 'Failed to cancel request.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setCancellingLeaveId(null);
      setLeaveToCancel(null);
    }
  };

  // Filter leaves locally
  const filteredLeaves = leaves.filter(l => {
    const d = new Date(l.date);
    const itemMonth = d.getUTCMonth() + 1;
    const itemYear = d.getUTCFullYear();

    const matchesYear = itemYear.toString() === selectedYear;
    const matchesMonth = selectedMonth === 'all' || itemMonth.toString() === selectedMonth;

    return matchesYear && matchesMonth;
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Leave Requests</h1>
          <p className="text-xs text-muted-foreground">
            Track approvals, check status by month, or request new time off.
          </p>
        </div>
        <Button
          onClick={() => setRequestModalOpen(true)}
          className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold cursor-pointer rounded-xl flex items-center gap-2"
        >
          <Plus className="w-4.5 h-4.5" />
          Request Leave
        </Button>
      </div>

      {/* Filter and overview container */}
      <Card className="border border-border bg-card rounded-3xl p-6 shadow-md">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-bold text-foreground">Filter by Period</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex flex-wrap gap-4 items-end">
          {/* Select Month */}
          <div className="space-y-1.5 flex flex-col w-full sm:w-48">
            <Label htmlFor="leaveMonth" className="text-xs font-semibold text-muted-foreground">Month</Label>
            <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val || 'all')}>
              <SelectTrigger id="leaveMonth" className="w-full bg-background border-border text-xs rounded-xl h-10">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map((name, idx) => (
                  <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select Year */}
          <div className="space-y-1.5 flex flex-col w-full sm:w-48">
            <Label htmlFor="leaveYear" className="text-xs font-semibold text-muted-foreground">Year</Label>
            <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val || '2026')}>
              <SelectTrigger id="leaveYear" className="w-full bg-background border-border text-xs rounded-xl h-10">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Roster Leaves List */}
      <Card className="border border-border bg-card rounded-3xl shadow-md p-6">
        <CardContent className="p-0">
          {filteredLeaves.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2">
              <CheckCircle className="w-10 h-10 text-fuchsia-500/40" />
              <p className="text-xs font-semibold">No leave requests found for the selected period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-2xl">
              <Table className="text-xs">
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Requested Date</TableHead>
                    <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Leave Reason / Remarks</TableHead>
                    <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Status</TableHead>
                    <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Requested On</TableHead>
                    <TableHead className="px-6 py-4 text-right font-bold uppercase text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaves.map((req) => {
                    return (
                      <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-6 py-4 font-bold text-foreground">
                        {formatShortLocalDateString(req.date)}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-medium text-foreground max-w-xs truncate" title={req.remarks || ''}>
                        {req.remarks || 'No reason provided'}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          req.approvalStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          req.approvalStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {req.approvalStatus}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">
                        {formatShortLocalDateString(req.createdAt)}
                      </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          {req.approvalStatus === 'PENDING' ? (
                            <Button
                              variant="ghost"
                              onClick={() => setLeaveToCancel(req)}
                              disabled={cancellingLeaveId === req.id}
                              className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer p-2 h-auto"
                              title="Cancel leave request"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic font-semibold">Audited</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* REQUEST LEAVE DIALOG */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border rounded-3xl p-6 gap-5">
          <DialogHeader className="border-b border-border/40 pb-3">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-fuchsia-400 animate-pulse" />
              Submit Leave Request
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Request a full-day off. Leave requests require manager/admin review before taking effect.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestLeave} className="space-y-4">
            {/* Holiday list warning if applicable */}
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-xs font-semibold text-muted-foreground">Select Target Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-xs border border-border bg-background rounded-xl h-10",
                      !leaveDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {leaveDate ? format(leaveDate, "PPP") : <span>Pick Roster Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={leaveDate}
                    onSelect={setLeaveDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="empLeaveReason" className="text-xs font-semibold text-muted-foreground">Reason / Comments</Label>
              <Textarea
                id="empLeaveReason"
                required
                rows={3}
                placeholder="Reason for requesting time off..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full text-xs rounded-xl resize-none"
              />
            </div>

            <DialogFooter className="flex gap-4 pt-3 bg-transparent border-t border-border/30">
              <Button type="button" variant="outline" onClick={() => setRequestModalOpen(false)} className="w-1/2 rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingLeave}
                className="w-1/2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {submittingLeave ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                Confirm Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CANCEL LEAVE CONFIRMATION DIALOG */}
      <Dialog open={!!leaveToCancel} onOpenChange={(open) => { if (!open) setLeaveToCancel(null); }}>
        <DialogContent className="sm:max-w-sm bg-card border border-border rounded-3xl p-6 gap-0">
          <DialogHeader className="pb-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5 text-rose-400" />
            </div>
            <DialogTitle className="text-base font-extrabold text-foreground text-center">
              Cancel Leave Request?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              Are you sure you want to cancel your leave request for <span className="font-semibold text-foreground">{leaveToCancel ? formatShortLocalDateString(leaveToCancel.date) : ''}</span>?
              <br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setLeaveToCancel(null)}
              className="flex-1 rounded-xl text-xs font-semibold">
              No, Keep
            </Button>
            <Button
              onClick={confirmCancelLeave}
              disabled={!!cancellingLeaveId}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              {cancellingLeaveId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
