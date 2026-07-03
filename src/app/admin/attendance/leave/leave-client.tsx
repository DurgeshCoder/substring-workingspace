'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Calendar as CalendarIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  History,
  Inbox
} from 'lucide-react';
import { toast } from 'sonner';
import { approveLeave, rejectLeave, getProcessedLeaves } from '@/actions/attendance';
import { formatShortLocalDateString, formatLocalDateString } from '../shared-helpers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // Leave approval states
  const [selectedLeave, setSelectedLeave] = useState<PendingLeaveRequest | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveManagerComment, setLeaveManagerComment] = useState('');
  const [processingLeave, setProcessingLeave] = useState(false);

  // Leave history states
  const [processedLeaves, setProcessedLeaves] = useState<any[]>([]);
  const [historyMonth, setHistoryMonth] = useState<number>(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Pagination states for pending list
  const [pendingPage, setPendingPage] = useState(1);
  const pendingPerPage = 10;

  // Pagination states for history list
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 10;

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const fetchHistory = async (m: number, y: number) => {
    setLoadingHistory(true);
    try {
      const res = await getProcessedLeaves(m, y);
      if (res.success && res.leaves) {
        setProcessedLeaves(res.leaves);
      } else {
        toast.error(res.error || 'Failed to load leave history.');
      }
    } catch (err) {
      toast.error('An error occurred loading leave history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory(historyMonth, historyYear);
  }, [historyMonth, historyYear]);

  useEffect(() => {
    setLeaveModalOpen(!!selectedLeave);
  }, [selectedLeave]);

  useEffect(() => {
    setPendingPage(1);
  }, [leaves.length]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyMonth, historyYear, processedLeaves.length]);

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
        fetchHistory(historyMonth, historyYear);
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leave Requests</h1>
        <p className="text-xs text-muted-foreground">
          Approve or reject employee requests for leaves on specific days.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all relative flex items-center gap-1.5 cursor-pointer outline-none ${
            activeTab === 'pending'
              ? 'text-rose-500 font-extrabold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Pending Requests</span>
          {leaves.length > 0 && (
            <span className="flex h-4.5 min-w-4.5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm shadow-rose-500/25">
              {leaves.length}
            </span>
          )}
          {activeTab === 'pending' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all relative flex items-center gap-1.5 cursor-pointer outline-none ${
            activeTab === 'history'
              ? 'text-indigo-400 font-extrabold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Leave History</span>
          {activeTab === 'history' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === 'pending' ? (
          /* Pending Leave Requests Card */
          <Card className="border border-border rounded-3xl shadow-md bg-card/60 backdrop-blur-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-rose-500" />
                Pending Leave Requests
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Approve or reject employee requests for leaves on specific days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaves.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl space-y-3 flex flex-col items-center bg-background/20">
                  <CheckCircle className="w-12 h-12 text-rose-500/40" />
                  <p className="text-sm font-semibold text-muted-foreground">No pending leave requests found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const paginatedPending = leaves.slice(
                      (pendingPage - 1) * pendingPerPage,
                      pendingPage * pendingPerPage
                    );

                    return (
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
                            {paginatedPending.map((req) => (
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
                    );
                  })()}

                  {/* Pending Pagination */}
                  {(() => {
                    const totalItems = leaves.length;
                    const totalPages = Math.ceil(totalItems / pendingPerPage);
                    if (totalPages <= 1) return null;

                    return (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-background/50 border border-border rounded-2xl p-4 shadow-sm">
                        <div className="text-xs text-muted-foreground font-medium">
                          Showing <span className="font-semibold text-foreground">{(pendingPage - 1) * pendingPerPage + 1}</span> to{' '}
                          <span className="font-semibold text-foreground">
                            {Math.min(pendingPage * pendingPerPage, totalItems)}
                          </span>{' '}
                          of <span className="font-semibold text-foreground">{totalItems}</span> requests
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-lg border-border hover:bg-muted cursor-pointer"
                            onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                            disabled={pendingPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            if (
                              page === 1 ||
                              page === totalPages ||
                              Math.abs(page - pendingPage) <= 1
                            ) {
                              return (
                                <Button
                                  key={page}
                                  variant={pendingPage === page ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn(
                                    'w-8 h-8 rounded-lg text-xs font-semibold cursor-pointer',
                                    pendingPage === page
                                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-0 shadow-md'
                                      : 'border-border hover:bg-muted'
                                  )}
                                  onClick={() => setPendingPage(page)}
                                >
                                  {page}
                                </Button>
                              );
                            }
                            if (
                              (page === 2 && pendingPage > 3) ||
                              (page === totalPages - 1 && pendingPage < totalPages - 2)
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
                            onClick={() => setPendingPage((p) => Math.min(totalPages, p + 1))}
                            disabled={pendingPage === totalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Processed Leaves History Card */
          <Card className="border border-border rounded-3xl shadow-md bg-card/60 backdrop-blur-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-650" />
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-400" />
                    Processed Leaves History
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Review approved and rejected leave requests for the selected month and year
                  </CardDescription>
                </div>

                {/* Filter selectors */}
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={String(historyMonth)}
                    onValueChange={(val) => setHistoryMonth(Number(val))}
                  >
                    <SelectTrigger className="w-[125px] bg-background border border-border text-xs rounded-xl h-8.5">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border text-xs rounded-xl">
                      {months.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(historyYear)}
                    onValueChange={(val) => setHistoryYear(Number(val))}
                  >
                    <SelectTrigger className="w-[95px] bg-background border border-border text-xs rounded-xl h-8.5">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border text-xs rounded-xl">
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {loadingHistory ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
              ) : processedLeaves.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl space-y-3 flex flex-col items-center bg-background/20">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground/30" />
                  <p className="text-sm font-semibold text-muted-foreground">No processed leave requests found for this period.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const paginatedHistory = processedLeaves.slice(
                      (historyPage - 1) * historyPerPage,
                      historyPage * historyPerPage
                    );
                    
                    return (
                      <div className="overflow-x-auto border border-border rounded-2xl">
                        <Table className="text-xs">
                          <TableHeader className="bg-muted">
                            <TableRow>
                              <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Employee</TableHead>
                              <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Date</TableHead>
                              <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Reason / Remarks</TableHead>
                              <TableHead className="px-6 py-4 font-bold uppercase text-muted-foreground">Processed By</TableHead>
                              <TableHead className="px-6 py-4 text-right font-bold uppercase text-muted-foreground">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedHistory.map((req) => (
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
                                <TableCell className="px-6 py-4 max-w-[220px] truncate font-medium text-foreground" title={req.remarks || ''}>
                                  {req.remarks || 'No reason provided'}
                                </TableCell>
                                <TableCell className="px-6 py-4 font-semibold text-muted-foreground">
                                  {req.approvedBy 
                                    ? `${req.approvedBy.firstName} ${req.approvedBy.lastName}`
                                    : 'System'}
                                </TableCell>
                                <TableCell className="px-6 py-4 text-right">
                                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase border ${
                                    req.approvalStatus === 'APPROVED' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  }`}>
                                    {req.approvalStatus}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}

                  {/* History Pagination */}
                  {(() => {
                    const totalItems = processedLeaves.length;
                    const totalPages = Math.ceil(totalItems / historyPerPage);
                    if (totalPages <= 1) return null;

                    return (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-background/50 border border-border rounded-2xl p-4 shadow-sm">
                        <div className="text-xs text-muted-foreground font-medium">
                          Showing <span className="font-semibold text-foreground">{(historyPage - 1) * historyPerPage + 1}</span> to{' '}
                          <span className="font-semibold text-foreground">
                            {Math.min(historyPage * historyPerPage, totalItems)}
                          </span>{' '}
                          of <span className="font-semibold text-foreground">{totalItems}</span> records
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-lg border-border hover:bg-muted cursor-pointer"
                            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            if (
                              page === 1 ||
                              page === totalPages ||
                              Math.abs(page - historyPage) <= 1
                            ) {
                              return (
                                <Button
                                  key={page}
                                  variant={historyPage === page ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn(
                                    'w-8 h-8 rounded-lg text-xs font-semibold cursor-pointer',
                                    historyPage === page
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-md'
                                      : 'border-border hover:bg-muted'
                                  )}
                                  onClick={() => setHistoryPage(page)}
                                >
                                  {page}
                                </Button>
                              );
                            }
                            if (
                              (page === 2 && historyPage > 3) ||
                              (page === totalPages - 1 && historyPage < totalPages - 2)
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
                            onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                            disabled={historyPage === totalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
