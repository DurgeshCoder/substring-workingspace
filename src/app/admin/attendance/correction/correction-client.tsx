'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CalendarRange, 
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  approveCorrection, 
  rejectCorrection 
} from '@/actions/attendance';
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
import { 
  formatTime12h, 
  formatLocalDateString 
} from '../shared-helpers';

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

interface CorrectionClientProps {
  initialCorrections: CorrectionRequest[];
}

export default function CorrectionClient({ initialCorrections }: CorrectionClientProps) {
  const [corrections, setCorrections] = useState<CorrectionRequest[]>(initialCorrections);

  // Correction approval states
  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionRequest | null>(null);
  const [managerComment, setManagerComment] = useState('');
  const [processingCorrection, setProcessingCorrection] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);

  useEffect(() => {
    setCorrectionModalOpen(!!selectedCorrection);
  }, [selectedCorrection]);

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
      } else {
        toast.error(res.error || 'Failed to process correction.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing correction.');
    } finally {
      setProcessingCorrection(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Corrections</h1>
        <p className="text-xs text-muted-foreground">
          Approve or reject employee requests for check-in/out hour corrections.
        </p>
      </div>

      <Card className="border border-border rounded-3xl shadow-md bg-card">
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
                        {formatLocalDateString(req.attendance.date)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-mono text-muted-foreground text-[11px]">
                          IN: {req.attendance.checkIn ? formatTime12h(req.attendance.checkIn) : '--:--'}
                        </div>
                        <div className="font-mono text-muted-foreground text-[11px] mt-0.5">
                          OUT: {req.attendance.checkOut ? formatTime12h(req.attendance.checkOut) : '--:--'}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-mono text-indigo-400 text-[11px] font-bold">
                          IN: {req.requestedCheckIn ? formatTime12h(req.requestedCheckIn) : '--:--'}
                        </div>
                        <div className="font-mono text-indigo-400 text-[11px] font-bold mt-0.5">
                          OUT: {req.requestedCheckOut ? formatTime12h(req.requestedCheckOut) : '--:--'}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 max-w-[200px] truncate" title={req.reason}>
                        {req.reason}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button
                          onClick={() => setSelectedCorrection(req)}
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer rounded-xl"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                    Original Entry
                  </span>
                  <div className="text-xs font-semibold text-foreground font-mono">
                    IN: {selectedCorrection.attendance.checkIn ? formatTime12h(selectedCorrection.attendance.checkIn) : '--:--'}
                  </div>
                  <div className="text-xs font-semibold text-foreground font-mono mt-0.5">
                    OUT: {selectedCorrection.attendance.checkOut ? formatTime12h(selectedCorrection.attendance.checkOut) : '--:--'}
                  </div>
                </div>

                <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                    Requested Entry
                  </span>
                  <div className="text-xs font-bold text-indigo-300 font-mono">
                    IN: {selectedCorrection.requestedCheckIn ? formatTime12h(selectedCorrection.requestedCheckIn) : '--:--'}
                  </div>
                  <div className="text-xs font-bold text-indigo-300 font-mono mt-0.5">
                    OUT: {selectedCorrection.requestedCheckOut ? formatTime12h(selectedCorrection.requestedCheckOut) : '--:--'}
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
    </div>
  );
}
