'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { sendSSEMessage } from '@/lib/sse';
import { 
  getTodayInTimezone, 
  convertLocalTimeToUTC, 
  getMinutesFromStartOfDayInTimezone 
} from '@/lib/timezone';

// Helper to check authentication
async function getSessionUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized. Access required.');
  }
  return session.user;
}

// -------------------------------------------------------------
// SHIFT MANAGEMENT
// -------------------------------------------------------------
export async function getShifts() {
  try {
    await getSessionUser();
    const shifts = await db.shift.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });
    return { success: true, shifts };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch shifts.' };
  }
}

export async function createShift(data: {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  halfDayAfter: string;
}) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Admin access required.');

    const shift = await db.shift.create({
      data,
    });

    await db.activityLog.create({
      data: {
        action: `Created Shift: ${data.name}`,
        entityType: 'Shift',
        entityId: shift.id,
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    revalidatePath('/admin/settings');
    return { success: true, shift };
  } catch (error: any) {
    return { error: error.message || 'Failed to create shift.' };
  }
}

export async function updateShift(id: string, data: {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  halfDayAfter: string;
  isActive: boolean;
}) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Admin access required.');

    const shift = await db.shift.update({
      where: { id },
      data,
    });

    await db.activityLog.create({
      data: {
        action: `Updated Shift: ${data.name}`,
        entityType: 'Shift',
        entityId: shift.id,
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    revalidatePath('/admin/settings');
    return { success: true, shift };
  } catch (error: any) {
    return { error: error.message || 'Failed to update shift.' };
  }
}

export async function assignShiftToEmployee(employeeId: string, shiftId: string | null) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Admin access required.');

    const emp = await db.user.update({
      where: { id: employeeId },
      data: { shiftId },
    });

    await db.activityLog.create({
      data: {
        action: `Assigned shift to employee: ${emp.firstName} ${emp.lastName}`,
        entityType: 'User',
        entityId: emp.id,
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to assign shift.' };
  }
}

export async function deleteShift(id: string) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Admin access required.');

    // Unassign any employees on this shift first
    await db.user.updateMany({
      where: { shiftId: id },
      data: { shiftId: null },
    });

    const shift = await db.shift.delete({ where: { id } });

    await db.activityLog.create({
      data: {
        action: `Deleted Shift: ${shift.name}`,
        entityType: 'Shift',
        entityId: shift.id,
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    revalidatePath('/admin/attendance');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete shift.' };
  }
}

// -------------------------------------------------------------
// HOLIDAY MANAGEMENT
// -------------------------------------------------------------
export async function getHolidays() {
  try {
    await getSessionUser();
    const holidays = await db.holiday.findMany({
      orderBy: { date: 'asc' },
    });
    return { success: true, holidays };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch holidays.' };
  }
}

export async function createHoliday(data: { title: string; date: string; type: string }) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Admin access required.');

    const [year, month, day] = data.date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const holiday = await db.holiday.create({
      data: {
        title: data.title,
        date: dateObj,
        type: data.type,
      },
    });

    await db.activityLog.create({
      data: {
        action: `Created Holiday: ${data.title}`,
        entityType: 'Holiday',
        entityId: holiday.id,
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    revalidatePath('/admin/settings');
    return { success: true, holiday };
  } catch (error: any) {
    return { error: error.message || 'Failed to create holiday.' };
  }
}

export async function deleteHoliday(id: string) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Admin access required.');

    const holiday = await db.holiday.delete({
      where: { id },
    });

    await db.activityLog.create({
      data: {
        action: `Deleted Holiday: ${holiday.title}`,
        entityType: 'Holiday',
        entityId: holiday.id,
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete holiday.' };
  }
}

// -------------------------------------------------------------
// HELPER CALCULATIONS FOR CHECK-IN/OUT
// -------------------------------------------------------------
function parseTimeToMinutes(timeStr: string): number {
  const [hrs, mins] = timeStr.split(':').map(Number);
  return hrs * 60 + mins;
}

function getMinutesFromStartOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

// -------------------------------------------------------------
// EMPLOYEE ATTENDANCE ACTIONS
// -------------------------------------------------------------
export async function getTodayAttendance() {
  try {
    const user = await getSessionUser();
    const today = getTodayInTimezone();

    // Fetch the DB user with their shift assignment
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      include: { shift: true },
    });

    // Resolve shift: assigned shift → first active shift → null
    let shift = dbUser?.shift ?? null;
    if (!shift) {
      shift = await db.shift.findFirst({ where: { isActive: true } });
    }

    const record = await db.attendance.findFirst({
      where: {
        employeeId: user.id,
        date: today,
      },
      include: {
        corrections: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return { success: true, record, shift };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch today\'s attendance.' };
  }
}

export async function checkIn(data: {
  latitude?: number;
  longitude?: number;
  address?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  remarks?: string;
}) {
  try {
    const user = await getSessionUser();
    const checkInTime = new Date();
    const today = getTodayInTimezone();

    // 1. Check if already checked in
    const existing = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: user.id,
          date: today,
        },
      },
    });

    if (existing) {
      return { error: 'You have already checked in today.' };
    }

    // 2. Fetch active shift (or default)
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    let shift = dbUser?.shiftId ? await db.shift.findUnique({ where: { id: dbUser.shiftId } }) : null;
    if (!shift) {
      // Find any general shift, or use defaults
      shift = await db.shift.findFirst({ where: { isActive: true } });
    }

    const shiftStartStr = shift?.startTime || '09:00';
    const graceMins = shift?.graceMinutes ?? 15;
    const halfDayStr = shift?.halfDayAfter || '10:30';

    const checkInMinutes = getMinutesFromStartOfDayInTimezone(checkInTime);
    const shiftStartMinutes = parseTimeToMinutes(shiftStartStr);
    const halfDayMinutes = parseTimeToMinutes(halfDayStr);

    let status = 'PRESENT';
    let lateMinutes = 0;

    // Check late arrival
    if (checkInMinutes > shiftStartMinutes + graceMins) {
      lateMinutes = checkInMinutes - shiftStartMinutes;
      if (checkInMinutes > halfDayMinutes) {
        status = 'HALF_DAY';
      } else {
        status = 'LATE';
      }
    }

    // Check if Holiday today
    const holidayToday = await db.holiday.findUnique({
      where: { date: today },
    });
    if (holidayToday) {
      status = 'HOLIDAY';
    }

    // Check if Weekend (Sunday)
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0) { // Sunday = 0
      if (status !== 'HOLIDAY') {
        status = 'WEEKEND';
      }
    }

    // 3. Create Attendance Record
    const record = await db.attendance.create({
      data: {
        employeeId: user.id,
        date: today,
        checkIn: checkInTime,
        status,
        lateMinutes,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        ipAddress: data.ipAddress,
        device: data.device,
        browser: data.browser,
        remarks: data.remarks,
        approvalStatus: 'APPROVED',
      },
    });

    // Create Audit Log
    await db.attendanceLog.create({
      data: {
        attendanceId: record.id,
        action: 'CHECK_IN',
        performedBy: `${user.firstName} ${user.lastName}`,
        newValue: JSON.stringify({ checkIn: checkInTime.toISOString(), status }),
      },
    });

    // Notify User via SSE
    sendSSEMessage(user.id, 'notification', {
      title: 'Checked In Successfully',
      message: `You checked in at ${checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Status: ${status}`,
    });

    // Notify Admin/Manager if late
    if (status === 'LATE' || status === 'HALF_DAY') {
      const admins = await db.user.findMany({ where: { role: 'ADMIN' } });
      admins.forEach((admin) => {
        sendSSEMessage(admin.id, 'notification', {
          title: 'Late Check In',
          message: `${user.firstName} ${user.lastName} checked in late today at ${checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        });
      });
    }

    revalidatePath('/employee/dashboard');
    return { success: true, record };
  } catch (error: any) {
    return { error: error.message || 'Failed to check in.' };
  }
}

export async function checkOut(id: string) {
  try {
    const user = await getSessionUser();
    const checkOutTime = new Date();

    const record = await db.attendance.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!record || record.employeeId !== user.id) {
      return { error: 'Attendance record not found.' };
    }

    if (record.checkOut) {
      return { error: 'You have already checked out today.' };
    }

    const checkInTime = record.checkIn;
    if (!checkInTime) {
      return { error: 'Cannot check out without check in.' };
    }

    // 1. Calculate working minutes
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const workingMinutes = Math.floor(diffMs / 1000 / 60);

    // Standard break: 45 minutes if they worked for more than 4 hours
    const breakMinutes = workingMinutes > 240 ? 45 : 0;

    // Actual working minutes
    const actualWorkingMinutes = Math.max(0, workingMinutes - breakMinutes);

    // 2. Fetch active shift (or default)
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    let shift = dbUser?.shiftId ? await db.shift.findUnique({ where: { id: dbUser.shiftId } }) : null;
    if (!shift) {
      shift = await db.shift.findFirst({ where: { isActive: true } });
    }

    const shiftStartStr = shift?.startTime || '09:00';
    const shiftEndStr = shift?.endTime || '18:00';
    const shiftStartMins = parseTimeToMinutes(shiftStartStr);
    const shiftEndMins = parseTimeToMinutes(shiftEndStr);
    const standardDuration = shiftEndMins - shiftStartMins;

    // Overtime
    let overtimeMinutes = 0;
    if (actualWorkingMinutes > standardDuration) {
      overtimeMinutes = actualWorkingMinutes - standardDuration;
    }

    // 3. Update Attendance
    const updatedRecord = await db.attendance.update({
      where: { id },
      data: {
        checkOut: checkOutTime,
        workingMinutes: actualWorkingMinutes,
        breakMinutes,
        overtimeMinutes,
      },
    });

    // Create Audit Log
    await db.attendanceLog.create({
      data: {
        attendanceId: id,
        action: 'CHECK_OUT',
        performedBy: `${user.firstName} ${user.lastName}`,
        oldValue: JSON.stringify({ checkOut: null }),
        newValue: JSON.stringify({ checkOut: checkOutTime.toISOString(), workingMinutes: actualWorkingMinutes, overtimeMinutes }),
      },
    });

    // Send SSE message to user
    sendSSEMessage(user.id, 'notification', {
      title: 'Checked Out Successfully',
      message: `You checked out at ${checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Total hours: ${Math.floor(actualWorkingMinutes / 60)}h ${actualWorkingMinutes % 60}m.`,
    });

    revalidatePath('/employee/dashboard');
    return { success: true, record: updatedRecord };
  } catch (error: any) {
    return { error: error.message || 'Failed to check out.' };
  }
}

// -------------------------------------------------------------
// ATTENDANCE CALENDAR & STATISTICS
// -------------------------------------------------------------
export async function getEmployeeCalendar(month: number, year: number, selectEmployeeId?: string) {
  try {
    const user = await getSessionUser();
    const targetUserId = (user.role === 'ADMIN' && selectEmployeeId) ? selectEmployeeId : user.id;

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const attendances = await db.attendance.findMany({
      where: {
        employeeId: targetUserId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const holidays = await db.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return { success: true, attendances, holidays };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch calendar.' };
  }
}

export async function getEmployeeStats() {
  try {
    const user = await getSessionUser();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const endDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

    const attendances = await db.attendance.findMany({
      where: {
        employeeId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const presentDays = attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const lateDays = attendances.filter(a => a.status === 'LATE').length;
    const halfDays = attendances.filter(a => a.status === 'HALF_DAY').length;
    const leaveDays = attendances.filter(a => a.status === 'ON_LEAVE' || a.status === 'LEAVE').length;
    const totalWorkingDays = endDate.getDate();

    const presentWeight = presentDays + halfDays * 0.5;
    const attendancePercentage = totalWorkingDays > 0 ? Math.round((presentWeight / totalWorkingDays) * 100) : 0;

    const pendingCorrections = await db.attendanceCorrection.count({
      where: {
        employeeId: user.id,
        status: 'PENDING',
      },
    });

    const totalWorkingMinutes = attendances.reduce((acc, curr) => acc + curr.workingMinutes, 0);
    const totalHours = Math.round(totalWorkingMinutes / 60);

    return {
      success: true,
      stats: {
        attendancePercentage,
        presentDays,
        lateCount: lateDays,
        halfDays,
        pendingCorrections,
        totalHours,
        leaveDays,
      },
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch employee statistics.' };
  }
}

// -------------------------------------------------------------
// CORRECTIONS WORKFLOW
// -------------------------------------------------------------
export async function raiseCorrection(
  target: string | { attendanceId?: string; date?: string },
  data: { requestedCheckIn: string; requestedCheckOut: string; reason: string }
) {
  try {
    const user = await getSessionUser();
    
    let attendanceId = typeof target === 'string' ? target : target.attendanceId;
    const targetDate = typeof target === 'string' ? undefined : target.date;
    
    if (!attendanceId && targetDate) {
      const [year, month, day] = targetDate.split('-').map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      
      // Check if attendance already exists
      let att = await db.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: user.id,
            date: dateObj,
          },
        },
      });
      
      if (!att) {
        // Create a placeholder attendance record with status 'ABSENT' and approvalStatus as 'PENDING'
        att = await db.attendance.create({
          data: {
            employeeId: user.id,
            date: dateObj,
            status: 'ABSENT',
            approvalStatus: 'PENDING',
          },
        });
      }
      attendanceId = att.id;
    }

    if (!attendanceId) {
      return { error: 'Attendance record or date must be provided.' };
    }
    
    const attendance = await db.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance || attendance.employeeId !== user.id) {
      return { error: 'Attendance record not found.' };
    }

    const existingPending = await db.attendanceCorrection.findFirst({
      where: {
        attendanceId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return { error: 'You already have a pending correction request for this date.' };
    }

    const dateStr = attendance.date.toISOString().split('T')[0];
    const checkInDateTime = convertLocalTimeToUTC(dateStr, data.requestedCheckIn);
    const checkOutDateTime = convertLocalTimeToUTC(dateStr, data.requestedCheckOut);

    const correction = await db.attendanceCorrection.create({
      data: {
        attendanceId,
        employeeId: user.id,
        requestedCheckIn: checkInDateTime,
        requestedCheckOut: checkOutDateTime,
        reason: data.reason,
        status: 'PENDING',
      },
    });

    await db.attendanceLog.create({
      data: {
        attendanceId,
        action: 'CORRECTION_REQUESTED',
        performedBy: `${user.firstName} ${user.lastName}`,
        newValue: JSON.stringify({
          requestedCheckIn: checkInDateTime.toISOString(),
          requestedCheckOut: checkOutDateTime.toISOString(),
          reason: data.reason,
        }),
      },
    });

    const admins = await db.user.findMany({ where: { role: 'ADMIN' } });
    const pendingCount = await db.attendanceCorrection.count({ where: { status: 'PENDING' } });
    admins.forEach((admin) => {
      sendSSEMessage(admin.id, 'notification', {
        title: 'New Correction Request',
        message: `${user.firstName} ${user.lastName} requested a correction. Total pending: ${pendingCount}.`,
      });
    });

    revalidatePath('/employee/dashboard');
    return { success: true, correction };
  } catch (error: any) {
    return { error: error.message || 'Failed to submit correction request.' };
  }
}

export async function getPendingCorrections() {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') {
      return { error: 'Unauthorized. Manager/Admin role required.' };
    }

    const corrections = await db.attendanceCorrection.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
          },
        },
        attendance: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, corrections };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch corrections.' };
  }
}

export async function approveCorrection(correctionId: string, managerComment?: string) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Unauthorized. Admin/Manager action.');

    const correction = await db.attendanceCorrection.findUnique({
      where: { id: correctionId },
      include: { attendance: true },
    });

    if (!correction) throw new Error('Correction request not found.');
    if (correction.status !== 'PENDING') throw new Error('This request has already been processed.');

    const checkInTime = correction.requestedCheckIn || correction.attendance.checkIn;
    const checkOutTime = correction.requestedCheckOut || correction.attendance.checkOut;

    let workingMinutes = 0;
    let breakMinutes = 0;
    let overtimeMinutes = 0;
    let lateMinutes = 0;
    let status = 'PRESENT';

    if (checkInTime) {
      const employee = await db.user.findUnique({ where: { id: correction.employeeId } });
      let shift = employee?.shiftId ? await db.shift.findUnique({ where: { id: employee.shiftId } }) : null;
      if (!shift) {
        shift = await db.shift.findFirst({ where: { isActive: true } });
      }

      const shiftStartStr = shift?.startTime || '09:00';
      const shiftEndStr = shift?.endTime || '18:00';
      const graceMins = shift?.graceMinutes ?? 15;
      const halfDayStr = shift?.halfDayAfter || '10:30';

      const checkInMins = getMinutesFromStartOfDayInTimezone(checkInTime);
      const shiftStartMins = parseTimeToMinutes(shiftStartStr);
      const halfDayMins = parseTimeToMinutes(halfDayStr);

      if (checkInMins > shiftStartMins + graceMins) {
        lateMinutes = checkInMins - shiftStartMins;
        if (checkInMins > halfDayMins) {
          status = 'HALF_DAY';
        } else {
          status = 'LATE';
        }
      }

      if (checkOutTime) {
        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
        workingMinutes = Math.floor(diffMs / 1000 / 60);
        breakMinutes = workingMinutes > 240 ? 45 : 0;
        const actualWorkingMinutes = Math.max(0, workingMinutes - breakMinutes);
        workingMinutes = actualWorkingMinutes;

        const standardDuration = parseTimeToMinutes(shiftEndStr) - shiftStartMins;
        if (actualWorkingMinutes > standardDuration) {
          overtimeMinutes = actualWorkingMinutes - standardDuration;
        }
      }
    }

    await db.attendance.update({
      where: { id: correction.attendanceId },
      data: {
        checkIn: checkInTime,
        checkOut: checkOutTime,
        workingMinutes,
        breakMinutes,
        overtimeMinutes,
        lateMinutes,
        status,
        approvalStatus: 'APPROVED',
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    const updatedCorrection = await db.attendanceCorrection.update({
      where: { id: correctionId },
      data: {
        status: 'APPROVED',
        managerComment,
        approvedAt: new Date(),
      },
    });

    await db.attendanceLog.create({
      data: {
        attendanceId: correction.attendanceId,
        action: 'CORRECTION_APPROVED',
        performedBy: `${user.firstName} ${user.lastName}`,
        oldValue: JSON.stringify({
          checkIn: correction.attendance.checkIn?.toISOString(),
          checkOut: correction.attendance.checkOut?.toISOString(),
          status: correction.attendance.status,
        }),
        newValue: JSON.stringify({
          checkIn: checkInTime?.toISOString(),
          checkOut: checkOutTime?.toISOString(),
          status,
          comment: managerComment,
        }),
      },
    });

    sendSSEMessage(correction.employeeId, 'notification', {
      title: 'Attendance Correction Approved',
      message: `Your correction request for ${correction.attendance.date.toLocaleDateString()} has been approved.`,
    });

    revalidatePath('/admin/dashboard');
    return { success: true, correction: updatedCorrection };
  } catch (error: any) {
    return { error: error.message || 'Failed to approve correction.' };
  }
}

export async function rejectCorrection(correctionId: string, managerComment?: string) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Unauthorized. Admin/Manager action.');

    const correction = await db.attendanceCorrection.findUnique({
      where: { id: correctionId },
    });

    if (!correction) throw new Error('Correction request not found.');
    if (correction.status !== 'PENDING') throw new Error('This request has already been processed.');

    const updatedCorrection = await db.attendanceCorrection.update({
      where: { id: correctionId },
      data: {
        status: 'REJECTED',
        managerComment,
        approvedAt: new Date(),
      },
    });

    await db.attendanceLog.create({
      data: {
        attendanceId: correction.attendanceId,
        action: 'CORRECTION_REJECTED',
        performedBy: `${user.firstName} ${user.lastName}`,
        newValue: JSON.stringify({
          status: 'REJECTED',
          comment: managerComment,
        }),
      },
    });

    sendSSEMessage(correction.employeeId, 'notification', {
      title: 'Attendance Correction Rejected',
      message: `Your correction request has been rejected. Reason: ${managerComment || 'No reason specified'}`,
    });

    revalidatePath('/admin/dashboard');
    return { success: true, correction: updatedCorrection };
  } catch (error: any) {
    return { error: error.message || 'Failed to reject correction.' };
  }
}

// -------------------------------------------------------------
// MANUAL ATTENDANCE (ADMIN)
// -------------------------------------------------------------
export async function addManualAttendance(data: {
  employeeId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string | null;
  reason: string;
}) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Admin access required.');

    const [year, month, day] = data.date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));

    const checkInTime = data.checkIn ? convertLocalTimeToUTC(data.date, data.checkIn) : null;
    const checkOutTime = data.checkOut ? convertLocalTimeToUTC(data.date, data.checkOut) : null;

    const employee = await db.user.findUnique({ where: { id: data.employeeId } });
    let shift = employee?.shiftId ? await db.shift.findUnique({ where: { id: employee.shiftId } }) : null;
    if (!shift) {
      shift = await db.shift.findFirst({ where: { isActive: true } });
    }

    const shiftStartStr = shift?.startTime || '09:00';
    const shiftEndStr = shift?.endTime || '18:00';
    const graceMins = shift?.graceMinutes ?? 15;
    const halfDayStr = shift?.halfDayAfter || '10:30';

    let status = data.status || 'PRESENT';
    let lateMinutes = 0;
    let workingMinutes = 0;
    let breakMinutes = 0;
    let overtimeMinutes = 0;

    // Only calculate times if checkInTime is provided
    if (checkInTime) {
      const checkInMins = getMinutesFromStartOfDayInTimezone(checkInTime);
      const shiftStartMins = parseTimeToMinutes(shiftStartStr);
      const halfDayMins = parseTimeToMinutes(halfDayStr);

      if (!data.status) {
        if (checkInMins > shiftStartMins + graceMins) {
          lateMinutes = checkInMins - shiftStartMins;
          if (checkInMins > halfDayMins) {
            status = 'HALF_DAY';
          } else {
            status = 'LATE';
          }
        } else {
          status = 'PRESENT';
        }
      }

      if (checkOutTime) {
        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
        const totalMinutes = Math.floor(diffMs / 1000 / 60);
        breakMinutes = totalMinutes > 240 ? 45 : 0;
        workingMinutes = Math.max(0, totalMinutes - breakMinutes);

        const standardDuration = parseTimeToMinutes(shiftEndStr) - shiftStartMins;
        if (workingMinutes > standardDuration) {
          overtimeMinutes = workingMinutes - standardDuration;
        }
      }
    } else {
      // If no check-in time is provided, we default to the status provided (e.g. ABSENT)
      status = data.status || 'ABSENT';
    }

    const existing = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: dateObj,
        },
      },
    });

    let record;
    if (existing) {
      record = await db.attendance.update({
        where: { id: existing.id },
        data: {
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status,
          workingMinutes,
          breakMinutes,
          overtimeMinutes,
          lateMinutes,
          remarks: `Manual correction: ${data.reason}`,
          approvalStatus: 'APPROVED',
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });

      await db.attendanceLog.create({
        data: {
          attendanceId: existing.id,
          action: 'MANUAL_OVERWRITE',
          performedBy: `${user.firstName} ${user.lastName}`,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(record),
        },
      });
    } else {
      record = await db.attendance.create({
        data: {
          employeeId: data.employeeId,
          date: dateObj,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status,
          workingMinutes,
          breakMinutes,
          overtimeMinutes,
          lateMinutes,
          remarks: `Manual insert: ${data.reason}`,
          approvalStatus: 'APPROVED',
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });

      await db.attendanceLog.create({
        data: {
          attendanceId: record.id,
          action: 'MANUAL_INSERT',
          performedBy: `${user.firstName} ${user.lastName}`,
          newValue: JSON.stringify(record),
        },
      });
    }

    sendSSEMessage(data.employeeId, 'notification', {
      title: 'Attendance Updated Manually',
      message: `An administrator updated your attendance for ${dateObj.toLocaleDateString()}. Status: ${status}`,
    });

    revalidatePath('/admin/employees');
    return { success: true, record };
  } catch (error: any) {
    return { error: error.message || 'Failed to apply manual attendance.' };
  }
}

// -------------------------------------------------------------
// REPORTS AND DASHBOARDS
// -------------------------------------------------------------
export async function getAdminDashboardStats() {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Admin role required.');

    const today = getTodayInTimezone();

    const totalEmployees = await db.user.count({ where: { status: 'ACTIVE' } });

    const attendances = await db.attendance.findMany({
      where: { date: today },
    });

    const presentCount = attendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const lateCount = attendances.filter(a => a.status === 'LATE').length;
    const halfDayCount = attendances.filter(a => a.status === 'HALF_DAY').length;
    const wfhCount = attendances.filter(a => a.status === 'WORK_FROM_HOME').length;
    const absentCount = totalEmployees - presentCount - halfDayCount - wfhCount;

    const pendingApprovals = await db.attendanceCorrection.count({
      where: { status: 'PENDING' },
    });

    const pendingLeaves = await db.attendance.count({
      where: {
        status: 'ON_LEAVE',
        approvalStatus: 'PENDING',
      },
    });

    return {
      success: true,
      stats: {
        totalEmployees,
        present: presentCount,
        late: lateCount,
        halfDay: halfDayCount,
        wfh: wfhCount,
        absent: Math.max(0, absentCount),
        pendingApprovals,
        pendingLeaves,
      },
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch dashboard stats.' };
  }
}

export async function getAttendanceReport(filters: {
  employeeId?: string;
  departmentId?: string;
  month?: number;
  year?: number;
  status?: string;
}) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') throw new Error('Admin access required.');

    const where: any = {};

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.departmentId) {
      where.employee = {
        departmentId: filters.departmentId,
      };
    }

    if (filters.month && filters.year) {
      const startDate = new Date(Date.UTC(filters.year, filters.month - 1, 1));
      const endDate = new Date(Date.UTC(filters.year, filters.month, 0, 23, 59, 59, 999));
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const records = await db.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { employee: { firstName: 'asc' } }],
    });

    return { success: true, records };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch report.' };
  }
}

export async function requestLeave(dateStr: string, reason: string) {
  try {
    const user = await getSessionUser();
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));

    const existing = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: user.id,
          date: dateObj,
        },
      },
    });

    if (existing) {
      if (existing.status === 'ON_LEAVE' || existing.status === 'LEAVE') {
        return { error: 'You have already applied for leave on this date.' };
      }
      return { error: 'An attendance record already exists for this date.' };
    }

    const record = await db.attendance.create({
      data: {
        employeeId: user.id,
        date: dateObj,
        status: 'ON_LEAVE',
        remarks: reason,
        approvalStatus: 'PENDING',
      },
    });

    await db.attendanceLog.create({
      data: {
        attendanceId: record.id,
        action: 'LEAVE_REQUESTED',
        performedBy: `${user.firstName} ${user.lastName}`,
        newValue: JSON.stringify({ reason }),
      },
    });

    const admins = await db.user.findMany({ where: { role: 'ADMIN' } });
    admins.forEach((admin) => {
      sendSSEMessage(admin.id, 'notification', {
        title: 'New Leave Request',
        message: `${user.firstName} ${user.lastName} requested leave on ${dateObj.toLocaleDateString()}. Reason: ${reason}`,
      });
    });

    revalidatePath('/employee/dashboard');
    return { success: true, record };
  } catch (error: any) {
    return { error: error.message || 'Failed to submit leave request.' };
  }
}

export async function getPendingLeaves() {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') {
      return { error: 'Unauthorized. Manager/Admin role required.' };
    }

    const leaves = await db.attendance.findMany({
      where: {
        status: 'ON_LEAVE',
        approvalStatus: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return { success: true, leaves };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch pending leaves.' };
  }
}

export async function approveLeave(attendanceId: string) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') {
      throw new Error('Unauthorized. Manager/Admin role required.');
    }

    const record = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        approvalStatus: 'APPROVED',
        approvedById: user.id,
        approvedAt: new Date(),
      },
      include: {
        employee: true,
      },
    });

    await db.attendanceLog.create({
      data: {
        attendanceId: record.id,
        action: 'LEAVE_APPROVED',
        performedBy: `${user.firstName} ${user.lastName}`,
      },
    });

    sendSSEMessage(record.employeeId, 'notification', {
      title: 'Leave Request Approved',
      message: `Your leave request for ${record.date.toLocaleDateString()} has been approved.`,
    });

    revalidatePath('/admin/attendance');
    revalidatePath('/employee/attendance');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to approve leave request.' };
  }
}

export async function rejectLeave(attendanceId: string, managerComment?: string) {
  try {
    const user = await getSessionUser();
    if (user.role !== 'ADMIN') {
      throw new Error('Unauthorized. Manager/Admin role required.');
    }

    const record = await db.attendance.update({
      where: { id: attendanceId },
      data: {
        status: 'ABSENT',
        approvalStatus: 'REJECTED',
        remarks: managerComment || 'Leave request rejected',
        approvedById: user.id,
        approvedAt: new Date(),
      },
      include: {
        employee: true,
      },
    });

    await db.attendanceLog.create({
      data: {
        attendanceId: record.id,
        action: 'LEAVE_REJECTED',
        performedBy: `${user.firstName} ${user.lastName}`,
        newValue: JSON.stringify({ managerComment }),
      },
    });

    sendSSEMessage(record.employeeId, 'notification', {
      title: 'Leave Request Rejected',
      message: `Your leave request for ${record.date.toLocaleDateString()} has been rejected. Reason: ${managerComment || 'No reason provided'}`,
    });

    revalidatePath('/admin/attendance');
    revalidatePath('/employee/attendance');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to reject leave request.' };
  }
}

