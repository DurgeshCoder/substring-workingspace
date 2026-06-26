export const TIMEZONE = process.env.TIMEZONE || process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Kolkata';

// Helper to get today's date at midnight UTC in the configured timezone
export function getTodayInTimezone(tz: string = TIMEZONE): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

// Convert a local date (e.g. "2026-06-26") and time (e.g. "09:00") in a given timezone into a UTC Date object
export function convertLocalTimeToUTC(
  dateStr: string,
  timeStr: string,
  tz: string = TIMEZONE
): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  const localDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(localDate);
  const val = (type: string) => Number(parts.find(p => p.type === type)?.value);
  
  const y = val('year');
  const m = val('month');
  const d = val('day');
  let h = val('hour');
  if (h === 24) h = 0;
  const min = val('minute');
  const s = val('second');
  
  const localUTC = Date.UTC(y, m - 1, d, h, min, s);
  const diff = localDate.getTime() - localUTC;
  return new Date(localDate.getTime() + diff);
}

// Helper to format a UTC date-time string or Date object into a 12h time string in the target timezone
export function formatTimeInTimezone(
  dateInput: Date | string | null | undefined,
  tz: string = TIMEZONE
): string {
  if (!dateInput) return '--:--';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '--:--';
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}

// Helper to format a UTC date-time string or Date object into a date string (YYYY-MM-DD) in the target timezone
export function formatDateInTimezone(
  dateInput: Date | string | null | undefined,
  tz: string = TIMEZONE
): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch (e) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Helper to get minutes from start of day in a given timezone
export function getMinutesFromStartOfDayInTimezone(
  date: Date,
  tz: string = TIMEZONE
): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  let hour = Number(parts.find(p => p.type === 'hour')?.value);
  if (hour === 24) hour = 0;
  const minute = Number(parts.find(p => p.type === 'minute')?.value);
  return hour * 60 + minute;
}
