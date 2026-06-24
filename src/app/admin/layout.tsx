"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
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
  ChevronDown,
  Sun,
  Moon,
  Kanban,
} from "lucide-react";
import { getUnreadCount } from "@/actions/notifications";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    const isLight =
      localStorage.getItem("theme") === "light" ||
      !document.documentElement.classList.contains("dark");
    setTheme(isLight ? "light" : "dark");
    if (isLight) {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  };

  useEffect(() => {
    if (!session?.user) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await getUnreadCount();
        if (res.success && typeof res.count === "number") {
          setUnreadCount(res.count);
        }
      } catch (err) {
        console.error("Failed to fetch unread count:", err);
      }
    };

    fetchUnreadCount();

    // Poll every 10 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 10000);

    return () => clearInterval(interval);
  }, [pathname, session]);

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Employees", href: "/admin/employees", icon: Users },
    { name: "Departments", href: "/admin/departments", icon: Building2 },
    { name: "Tasks", href: "/admin/tasks", icon: CheckSquare },
    { name: "Task Board", href: "/admin/task-board", icon: Kanban },
    { name: "Notifications", href: "/admin/notifications", icon: Bell },
    { name: "Activity Logs", href: "/admin/activity-logs", icon: History },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const userDisplayName = session?.user
    ? `${session.user.firstName} ${session.user.lastName}`
    : "Admin User";

  const userEmail = session?.user?.email || "admin@ems.com";
  const employeeCode = session?.user?.employeeCode || "EMP-001";

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link
            href="/admin/dashboard"
            className="flex items-center space-x-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-foreground">Workspace</span>
          </Link>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
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
                    ? "bg-gradient-to-r from-indigo-600/20 to-fuchsia-600/10 border border-indigo-500/20 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? "text-indigo-500 dark:text-indigo-400"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="flex-1">{item.name}</span>
                {item.name === "Notifications" && unreadCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse shadow-md shadow-rose-500/25">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-border bg-card/50">
          <div className="flex items-center space-x-3 px-2 py-1.5 rounded-lg">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 font-bold text-sm">
              {session?.user?.firstName?.[0] || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">
                {userDisplayName}
              </p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {employeeCode}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="hidden md:block font-semibold text-foreground">
              Admin Portal
            </h2>
          </div>

          <div className="flex items-center space-x-4 relative">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl bg-card border border-border hover:bg-muted cursor-pointer"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 text-foreground/80 hover:text-foreground transition-colors"
              >
                <span className="text-xs font-medium max-w-[120px] truncate">
                  {userDisplayName}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2.5 w-48 bg-card border border-border rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {userDisplayName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {userEmail}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-rose-400 hover:bg-muted transition-colors text-left"
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
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
