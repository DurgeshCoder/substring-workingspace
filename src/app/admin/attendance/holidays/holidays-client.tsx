'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar as CalendarIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { createHoliday, deleteHoliday } from '@/actions/attendance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Holiday {
  id: string;
  title: string;
  date: Date | string;
  type: string;
}

interface HolidaysClientProps {
  initialHolidays: Holiday[];
}

export default function HolidaysClient({ initialHolidays }: HolidaysClientProps) {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [newHoliday, setNewHoliday] = useState({
    title: '',
    date: '',
    type: 'National',
  });
  const [holidayDate, setHolidayDate] = useState<Date | undefined>(undefined);
  const [loadingHolidayAction, setLoadingHolidayAction] = useState(false);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Holidays Calendar</h1>
        <p className="text-xs text-muted-foreground">
          Define national, restricted, optional holidays, or festivals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Holidays list */}
        <Card className="lg:col-span-2 border border-border bg-card rounded-3xl shadow-md p-6">
          <CardHeader className="p-0 pb-6">
            <CardTitle className="text-lg font-bold text-foreground">Holidays List</CardTitle>
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
                      onClick={() => handleDeleteHoliday(holiday.id)}
                      className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer p-2 h-auto"
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
        <Card className="border border-border bg-card rounded-3xl shadow-md p-6 h-fit">
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
                  className="w-full text-xs rounded-xl"
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
                        "w-full justify-start text-left font-normal text-xs border border-border bg-background rounded-xl",
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
                  <SelectTrigger id="hType" className="w-full bg-background border border-border text-xs rounded-xl">
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
    </div>
  );
}
