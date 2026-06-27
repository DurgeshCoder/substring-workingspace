'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Pencil,
  UserCheck, 
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  createShift, 
  updateShift,
  deleteShift,
  assignShiftToEmployee
} from '@/actions/attendance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatTimeTo12h } from '../shared-helpers';

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

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  shiftId: string | null;
}

interface ShiftsClientProps {
  initialShifts: Shift[];
  employees: Employee[];
}

export default function ShiftsClient({ initialShifts, employees }: ShiftsClientProps) {
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  
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

  // Edit / Delete shift states
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);
  const [editShiftForm, setEditShiftForm] = useState({
    name: '', startTime: '09:00', endTime: '18:00', graceMinutes: 15, halfDayAfter: '10:30', isActive: true,
  });

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

  const handleOpenEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setEditShiftForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: shift.graceMinutes,
      halfDayAfter: shift.halfDayAfter,
      isActive: shift.isActive,
    });
  };

  const handleSaveEditShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;
    setLoadingShiftAction(true);
    try {
      const res = await updateShift(editingShift.id, editShiftForm);
      if (res.success && res.shift) {
        setShifts(shifts.map(s => s.id === editingShift.id ? { ...s, ...editShiftForm, _count: s._count } : s));
        setEditingShift(null);
        toast.success('Shift updated successfully.');
      } else {
        toast.error(res.error || 'Failed to update shift.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoadingShiftAction(false);
    }
  };

  const handleDeleteShift = (shift: Shift) => {
    setShiftToDelete(shift);
  };

  const confirmDeleteShift = async () => {
    if (!shiftToDelete) return;
    setDeletingShiftId(shiftToDelete.id);
    try {
      const res = await deleteShift(shiftToDelete.id);
      if (res.success) {
        setShifts(shifts.filter(s => s.id !== shiftToDelete.id));
        toast.success('Shift deleted successfully.');
      } else {
        toast.error(res.error || 'Failed to delete shift.');
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
    } finally {
      setDeletingShiftId(null);
      setShiftToDelete(null);
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEmpId || !assigningShiftId) return;
    setLoadingShiftAction(true);
    try {
      const res = await assignShiftToEmployee(assigningEmpId, assigningShiftId === 'none' ? null : assigningShiftId);
      if (res.success) {
        toast.success('Shift assigned successfully.');
        setShifts(shifts.map(s => {
          const wasPrevious = employees.find(emp => emp.id === assigningEmpId)?.shiftId === s.id;
          const isCurrent = s.id === assigningShiftId;
          const newCount = (s._count?.users ?? 0) + (isCurrent ? 1 : 0) - (wasPrevious ? 1 : 0);
          return { ...s, _count: { users: Math.max(0, newCount) } };
        }));
        // Update employee's local shift assignment state
        const employee = employees.find(emp => emp.id === assigningEmpId);
        if (employee) {
          employee.shiftId = assigningShiftId === 'none' ? null : assigningShiftId;
        }
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shift Management</h1>
        <p className="text-xs text-muted-foreground">
          Configure work shifts, set start/end timings, half-day offsets, and grace periods.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shifts list */}
        <Card className="lg:col-span-2 border border-border bg-card rounded-3xl shadow-md p-6">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-lg font-bold text-foreground">Work Shifts</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Manage active shifts and grace settings</CardDescription>
          </CardHeader>

          <CardContent className="p-0 space-y-3">
            {shifts.map((shift) => (
              <div key={shift.id} className="p-4 bg-background/50 border border-border/60 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    {shift.name}
                    {shift.isActive
                      ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
                      : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">INACTIVE</span>
                    }
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {shift.startTime} – {shift.endTime} &nbsp;&middot;&nbsp; Grace: {shift.graceMinutes} min &nbsp;&middot;&nbsp; Half-Day: {shift.halfDayAfter}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-extrabold uppercase bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                    {shift._count?.users ?? 0} Assigned
                  </span>
                  <button
                    onClick={() => handleOpenEditShift(shift)}
                    className="p-2 rounded-lg border border-border hover:border-indigo-500/40 hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-400 transition-all cursor-pointer"
                    title="Edit shift"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteShift(shift)}
                    className="p-2 rounded-lg border border-border hover:border-rose-500/40 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-all cursor-pointer"
                    title="Delete shift"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {shifts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No shifts created yet.</p>
            )}
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
                  <SelectTrigger id="assignEmp" className="w-full bg-background border border-border text-xs rounded-xl">
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
                  Target Work Shift
                </Label>
                <Select
                  value={assigningShiftId}
                  onValueChange={(val) => setAssigningShiftId(val || '')}
                >
                  <SelectTrigger id="assignShift" className="w-full bg-background border border-border text-xs rounded-xl">
                    <SelectValue placeholder="-- Choose Shift --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Unassign Shift --</SelectItem>
                    {shifts.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loadingShiftAction || !assigningEmpId || !assigningShiftId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer rounded-xl flex items-center gap-2 h-9"
              >
                {loadingShiftAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Assign Shift
              </Button>
            </form>
          </div>
        </Card>

        {/* Create Shift Form */}
        <Card className="border border-border bg-card rounded-3xl p-6 shadow-md h-fit">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> Create Work Shift
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Define a new work shift roster timing</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={handleCreateShift} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="shiftName" className="text-xs font-semibold text-muted-foreground">
                  Shift Name
                </Label>
                <Input
                  id="shiftName"
                  type="text"
                  required
                  placeholder="e.g. Regular Shift"
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  className="w-full text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="text-xs font-semibold text-muted-foreground">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    required
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="text-xs font-semibold text-muted-foreground">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    required
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="grace" className="text-xs font-semibold text-muted-foreground">
                    Grace Minutes
                  </Label>
                  <Input
                    id="grace"
                    type="number"
                    min="0"
                    max="120"
                    required
                    value={newShift.graceMinutes}
                    onChange={(e) => setNewShift({ ...newShift, graceMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="halfDay" className="text-xs font-semibold text-muted-foreground">
                    Half-Day After
                  </Label>
                  <Input
                    id="halfDay"
                    type="time"
                    required
                    value={newShift.halfDayAfter}
                    onChange={(e) => setNewShift({ ...newShift, halfDayAfter: e.target.value })}
                    className="w-full text-xs rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loadingShiftAction}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer rounded-xl flex items-center justify-center gap-2"
              >
                {loadingShiftAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Shift
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* EDIT SHIFT DIALOG */}
      <Dialog open={!!editingShift} onOpenChange={(open) => { if (!open) setEditingShift(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border border-border rounded-3xl p-6 gap-0">
          <DialogHeader className="border-b border-border/40 pb-4 mb-5">
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Pencil className="w-4 h-4 text-indigo-400" />
              Edit Shift
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update the details for <span className="font-semibold text-foreground">{editingShift?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditShift} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Shift Name</Label>
              <Input
                required
                value={editShiftForm.name}
                onChange={e => setEditShiftForm({ ...editShiftForm, name: e.target.value })}
                className="text-xs bg-background border-border rounded-xl focus-visible:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Start Time</Label>
                <Input type="time" required value={editShiftForm.startTime}
                  onChange={e => setEditShiftForm({ ...editShiftForm, startTime: e.target.value })}
                  className="text-xs bg-background border-border rounded-xl focus-visible:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">End Time</Label>
                <Input type="time" required value={editShiftForm.endTime}
                  onChange={e => setEditShiftForm({ ...editShiftForm, endTime: e.target.value })}
                  className="text-xs bg-background border-border rounded-xl focus-visible:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Half-Day After</Label>
                <Input type="time" required value={editShiftForm.halfDayAfter}
                  onChange={e => setEditShiftForm({ ...editShiftForm, halfDayAfter: e.target.value })}
                  className="text-xs bg-background border-border rounded-xl focus-visible:border-indigo-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Grace Period (mins)</Label>
                <Input type="number" min={0} max={120} required value={editShiftForm.graceMinutes}
                  onChange={e => setEditShiftForm({ ...editShiftForm, graceMinutes: Number(e.target.value) })}
                  className="text-xs bg-background border-border rounded-xl focus-visible:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Status</Label>
                <select
                  value={editShiftForm.isActive ? 'true' : 'false'}
                  onChange={e => setEditShiftForm({ ...editShiftForm, isActive: e.target.value === 'true' })}
                  className="flex h-9 w-full rounded-xl border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/30 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingShift(null)}
                className="rounded-xl text-xs font-semibold">
                Cancel
              </Button>
              <Button type="submit" disabled={loadingShiftAction}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                {loadingShiftAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE SHIFT CONFIRM DIALOG */}
      <Dialog open={!!shiftToDelete} onOpenChange={(open) => { if (!open) setShiftToDelete(null); }}>
        <DialogContent className="sm:max-w-sm bg-card border border-border rounded-3xl p-6 gap-0">
          <DialogHeader className="pb-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5 text-rose-400" />
            </div>
            <DialogTitle className="text-base font-extrabold text-foreground text-center">
              Delete Shift?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center">
              You are about to delete <span className="font-semibold text-foreground">&ldquo;{shiftToDelete?.name}&rdquo;</span>.
              <br />
              All employees assigned to this shift will be <span className="text-amber-400 font-semibold">unassigned</span>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShiftToDelete(null)}
              className="flex-1 rounded-xl text-xs font-semibold">
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteShift}
              disabled={!!deletingShiftId}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              {deletingShiftId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
