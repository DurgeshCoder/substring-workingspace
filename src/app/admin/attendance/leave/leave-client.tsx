'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Calendar as CalendarIcon,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { approveLeave, rejectLeave } from '@/actions/attendance';
import { formatShortLocalDateString, formatLocalDateString } from '../shared-helpers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
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

interface LeaveClientProps {
  initialLeaves: PendingLeaveRequest[];
}

export default function LeaveClient({ initialLeaves }: LeaveClientProps) {
  const [leaves, setLeaves] = useState<PendingLeaveRequest[]>(initialLeaves);

  // Leave approval states
  const [selectedLeave, setSelectedLeave] = useState<PendingLeaveRequest | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveManagerComment, setLeaveManagerComment] = useState('');
  const [processingLeave, setProcessingLeave] = useState(false);

  useEffect(() => {
    setLeaveModalOpen(!!selectedLeave);
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
      } else {
        toast.error(res.error || 'Failed to process leave request.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing leave request.');
    } finally {
      setProcessingLeave(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leave Requests</h1>
        <p className="text-xs text-muted-foreground">
          Approve or reject employee requests for leaves on specific days.
        </p>
      </div>

      <Card className="border border-border rounded-3xl shadow-md bg-card/60 backdrop-blur-sm relative overflow-hidden">
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
                        {formatShortLocalDateString(req.date)}
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

              <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-1">
                  Requested Date
                </span>
                <div className="text-xs font-bold text-rose-350">
                  {formatLocalDateString(selectedLeave.date)}
                </div>
              </div>

              <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                  Reason for leave request
                </span>
                <p className="text-xs text-foreground font-medium italic">
                  "{selectedLeave.remarks || 'No reason provided'}"
                </p>
              </div>

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
