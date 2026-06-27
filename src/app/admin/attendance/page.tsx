import { redirect } from 'next/navigation';

export default async function AdminAttendancePage() {
  redirect('/admin/attendance/overview');
}
