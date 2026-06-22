'use client';

import React, { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/validations/auth';
import { loginAction } from '@/actions/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { useSession } from 'next-auth/react';

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const { update } = useSession();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
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

      toast.success('Successfully logged in!');

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
          fetch('/api/auth/session')
            .then((res) => res.json())
            .then((session) => {
              const role = session?.user?.role;
              if (role === 'ADMIN') {
                router.push('/admin/dashboard');
              } else {
                router.push('/employee/dashboard');
              }
              router.refresh();
            })
            .catch(() => {
              // Default fallback if session endpoint fails
              router.push('/login');
              router.refresh();
            });
        }
      }, 500);
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Dynamic Animated Background Orbs */}
      <div className="absolute inset-0 bg-slate-950 z-0" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full filter blur-3xl animate-pulse z-0" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full filter blur-3xl animate-pulse delay-1000 z-0" />

      {/* Grid Pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 z-10 space-y-6">
        
        {/* Brand Logo and Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25 text-white mb-2">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-slate-100 to-fuchsia-200">
            Welcome Back
          </h1>
          <p className="text-slate-400 text-sm">
            Sign in to manage your workspace and employees
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Email input field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email Address
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Mail className="w-5 h-5" />
              </span>
              <input
                {...register('email')}
                type="email"
                disabled={isLoading}
                placeholder="you@company.com"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Please contact your system Administrator to reset your password.");
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 pl-10 pr-10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-400 font-medium mt-0.5">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full group py-3 px-4 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-75 disabled:cursor-not-allowed disabled:active:scale-100 mt-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

        </form>

        {/* Demo Credentials Section */}
        <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div className="bg-slate-950/40 border border-slate-800/50 p-2 rounded-lg text-left">
              <span className="font-bold text-indigo-400 block mb-0.5">Admin:</span>
              <span>admin@ems.com</span>
              <span className="block text-slate-500">pass: admin1234</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/50 p-2 rounded-lg text-left">
              <span className="font-bold text-fuchsia-400 block mb-0.5">Employee:</span>
              <span>employee@ems.com</span>
              <span className="block text-slate-500">pass: employee1234</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-slate-400">Loading workspace portal...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
