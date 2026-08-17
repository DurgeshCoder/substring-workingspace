"use client";

import React, { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/validations/auth";
import { loginAction } from "@/actions/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const { update } = useSession();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await loginAction(data);

      if (result.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      toast.success("Successfully logged in!");

      // Force session refresh
      await update();

      // Fetch user role to route appropriately
      // We make a quick call to check current session client-side
      setTimeout(() => {
        if (callbackUrl) {
          router.push(callbackUrl);
          router.refresh();
        } else {
          // Check role from session
          fetch("/api/auth/session")
            .then((res) => res.json())
            .then((session) => {
              const role = session?.user?.role;
              if (role === "ADMIN") {
                router.push("/admin/dashboard");
              } else {
                router.push("/employee/dashboard");
              }
              router.refresh();
            })
            .catch(() => {
              // Default fallback if session endpoint fails
              router.push("/login");
              router.refresh();
            });
        }
      }, 500);
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background transition-colors duration-200">
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob-bounce {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(25px, -45px) scale(1.08); }
          66% { transform: translate(-15px, 15px) scale(0.96); }
        }
        @keyframes rotate-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float-window {
          0%, 100% { transform: perspective(1000px) rotateY(14deg) rotateX(8deg) rotateZ(-2deg) translateY(0px); }
          50% { transform: perspective(1000px) rotateY(11deg) rotateX(10deg) rotateZ(-3deg) translateY(-14px); }
        }
        .animate-blob-slow {
          animation: blob-bounce 14s infinite alternate ease-in-out;
        }
        .animate-rotate-slow {
          animation: rotate-slow 35s infinite linear;
        }
        .animate-float-window {
          animation: float-window 7s infinite ease-in-out;
        }
      `}} />

      {/* Left panel: Premium Branding & Animated Graphics */}
      <div className="hidden md:flex md:w-[45%] lg:w-[50%] relative bg-slate-950 flex-col justify-between p-12 overflow-hidden border-r border-slate-900">
        {/* Animated Background Blur Orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/15 rounded-full filter blur-[80px] animate-blob-slow z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full filter blur-[80px] animate-blob-slow z-0" style={{ animationDelay: "4s" }} />

        {/* Abstract vector grid overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0"
             style={{
               backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
               backgroundSize: "24px 24px"
             }}
        />

        {/* Top Branding Header */}
        <div className="flex items-center space-x-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-lg border border-slate-800">
            <img src="/substring_logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white leading-tight">Substring Space</span>
        </div>

        {/* Center Panel: Slogan and interactive 3D macOS mockup visual */}
        <div className="my-auto space-y-12 z-10 max-w-lg">
          {/* Animated 3D Floating Dashboard mock */}
          <div className="relative w-full max-w-sm aspect-[1.58] mx-auto md:mx-0 flex items-center justify-center pt-4">
            {/* Glowing neon ring backdrop */}
            <div className="absolute w-[90%] h-[90%] bg-gradient-to-tr from-indigo-500/10 via-blue-500/10 to-fuchsia-500/10 rounded-2xl blur-xl animate-pulse" />
            
            {/* Floating Window */}
            <div className="animate-float-window w-full h-full bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl shadow-2xl p-4 flex flex-col justify-between select-none"
                 style={{
                   boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 25px rgba(99, 102, 241, 0.08)"
                 }}>
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="text-[9px] font-semibold text-slate-500 tracking-wider uppercase font-mono">Workspace Overview</div>
                <div className="w-6"></div>
              </div>

              {/* Window Body Grid */}
              <div className="flex-1 grid grid-cols-3 gap-3 pt-3">
                {/* Column 1: Workspace Modules Mock */}
                <div className="space-y-1.5 border-r border-slate-800/40 pr-2">
                  <div className="h-3.5 w-full bg-slate-800/50 rounded-md flex items-center px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1" />
                    <span className="text-[7.5px] text-slate-300 font-bold font-mono">Tasks</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-800/30 rounded-md flex items-center px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mr-1" />
                    <span className="text-[7.5px] text-slate-500 font-mono">Attendance</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-800/30 rounded-md flex items-center px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mr-1" />
                    <span className="text-[7.5px] text-slate-500 font-mono">Credentials</span>
                  </div>
                </div>

                {/* Column 2: Work-related states and stats */}
                <div className="col-span-2 flex flex-col justify-between pl-1">
                  {/* Task Stat widget */}
                  <div className="bg-slate-850/60 border border-slate-800/60 rounded-lg p-1.5 flex items-center justify-between">
                    <div>
                      <div className="text-[6.5px] text-slate-500 uppercase font-bold tracking-wider">Weekly Tasks</div>
                      <div className="text-[10px] font-extrabold text-slate-200 mt-0.5">18 / 24 Done</div>
                    </div>
                    {/* Tiny Progress Circle/Bar */}
                    <div className="w-6 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="w-[75%] h-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                    </div>
                  </div>

                  {/* Attendance & Certificates split row */}
                  <div className="grid grid-cols-2 gap-2 mt-1 flex-1">
                    {/* Attendance Card */}
                    <div className="bg-slate-850/40 border border-slate-800/50 rounded-lg p-1 flex flex-col justify-between">
                      <span className="text-[6px] text-slate-500 font-bold uppercase">Presence</span>
                      <span className="text-[9px] text-emerald-400 font-extrabold">98.2%</span>
                    </div>

                    {/* Certificates Card */}
                    <div className="bg-slate-850/40 border border-slate-800/50 rounded-lg p-1 flex flex-col justify-between">
                      <span className="text-[6px] text-slate-500 font-bold uppercase">Issued</span>
                      <span className="text-[9px] text-amber-400 font-extrabold">85 Certs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight text-left">
              Simplify <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Operations</span> & <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Credentials</span>
            </h2>
            <p className="text-slate-400 text-sm lg:text-base leading-relaxed text-left">
              The all-in-one corporate workspace portal. Manage secure attendance tracking, dynamic employee workflows, and issue verified completion credentials instantly.
            </p>
          </div>
          
          <div className="pt-4 flex items-center gap-3">
            <div className="h-1 w-12 rounded-full bg-blue-500"></div>
            <div className="h-1 w-3 rounded-full bg-slate-700"></div>
            <div className="h-1 w-3 rounded-full bg-slate-700"></div>
          </div>
        </div>

        {/* Bottom Copyright Meta */}
        <div className="text-slate-500 text-xs font-medium z-10">
          &copy; {new Date().getFullYear()} Substring Technologies. All rights reserved.
        </div>
      </div>

      {/* Right panel: Polished Theme-Adaptive Login Form */}
      <div className="w-full md:w-[55%] lg:w-[50%] flex items-center justify-center p-8 sm:p-12 relative overflow-hidden bg-background text-foreground">
        {/* Subtle background glow for mobile/light/dark modes */}
        <div className="md:hidden absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full filter blur-3xl -z-10" />
        <div className="md:hidden absolute bottom-1/4 right-1/4 w-80 h-80 bg-fuchsia-500/10 dark:bg-fuchsia-500/5 rounded-full filter blur-3xl -z-10" />

        {/* Form Container Card */}
        <div className="w-full max-w-md space-y-7 z-10">
          {/* Logo only on mobile */}
          <div className="md:hidden flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-md border border-border">
              <img src="/substring_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-foreground leading-tight">Substring Space</span>
          </div>

          <div className="space-y-2 text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Sign In
            </h1>
            <p className="text-muted-foreground text-sm">
              Please enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
            {/* Email input field */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground group-focus-within:text-indigo-500 transition-colors">
                  <Mail className="w-4.5 h-4.5" />
                </span>
                <Input
                  {...register("email")}
                  type="email"
                  disabled={isLoading}
                  placeholder="name@substringtechnologies.com"
                  className="h-11 bg-muted/40 dark:bg-muted/20 border-border rounded-xl pl-10 pr-4 text-foreground placeholder-muted-foreground/60 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password input field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info(
                      "Please contact your system Administrator to reset your password.",
                    );
                  }}
                  className="text-xs text-indigo-500 hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors font-medium"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground group-focus-within:text-indigo-500 transition-colors">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  disabled={isLoading}
                  placeholder="••••••••"
                  className="h-11 bg-muted/40 dark:bg-muted/20 border-border rounded-xl pl-10 pr-10 text-foreground placeholder-muted-foreground/60 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-650 dark:hover:bg-indigo-750 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all duration-150 mt-2 cursor-pointer border-0"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs text-muted-foreground">
              Loading workspace portal...
            </p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
