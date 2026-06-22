'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CheckSquare, 
  Bell, 
  History, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield,
  ChevronDown
} from 'lucide-react';
import { getUnreadCount } from '@/actions/notifications';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await getUnreadCount();
        if (res.success && typeof res.count === 'number') {
          setUnreadCount(res.count);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };

    fetchUnreadCount();

    // Poll every 10 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 10000);

    return () => clearInterval(interval);
  }, [pathname, session]);

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Employees', href: '/admin/employees', icon: Users },
    { name: 'Departments', href: '/admin/departments', icon: Building2 },
    { name: 'Tasks', href: '/admin/tasks', icon: CheckSquare },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Activity Logs', href: '/admin/activity-logs', icon: History },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const userDisplayName = session?.user 
    ? `${session.user.firstName} ${session.user.lastName}` 
    : 'Admin User';

  const userEmail = session?.user?.email || 'admin@ems.com';
  const employeeCode = session?.user?.employeeCode || 'EMP-001';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
          <Link href="/admin/dashboard" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
              EMS Admin
            </span>
          </Link>
          <button 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/20 to-fuchsia-600/10 border border-indigo-500/20 text-indigo-200'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span className="flex-1">{item.name}</span>
                {item.name === 'Notifications' && unreadCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse shadow-md shadow-rose-500/25">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-3 px-2 py-1.5 rounded-lg">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
              {session?.user?.firstName?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
                {userDisplayName}
              </p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                {employeeCode}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <button
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="hidden md:block font-semibold text-slate-300">
              Admin Portal
            </h2>
          </div>

          <div className="flex items-center space-x-4 relative">
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
              >
                <span className="text-xs font-medium max-w-[120px] truncate">
                  {userDisplayName}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2.5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-800/60">
                      <p className="text-xs font-semibold text-slate-300 truncate">{userDisplayName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{userEmail}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-rose-400 hover:bg-slate-800 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>

      </div>
    </div>
  );
}
