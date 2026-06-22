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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Dynamic Animated Background Orbs */}
      <div className="absolute inset-0 bg-background z-0" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full filter blur-3xl animate-pulse z-0" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full filter blur-3xl animate-pulse delay-1000 z-0" />

      {/* Grid Pattern overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      />

      {/* Login Card */}
      <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-8 z-10 space-y-6">
        {/* Brand Logo and Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25 text-white mb-2">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-slate-100 to-fuchsia-200">
            Welcome Back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to manage your workspace and employees
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email input field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Email Address
            </Label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground group-focus-within:text-indigo-400 transition-colors">
                <Mail className="w-5 h-5" />
              </span>
              <Input
                {...register("email")}
                type="email"
                disabled={isLoading}
                placeholder="you@company.com"
                className="h-11 bg-background/80 border-border rounded-xl pl-10 pr-4 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
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
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
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
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground group-focus-within:text-indigo-400 transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <Input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                disabled={isLoading}
                placeholder="••••••••"
                className="h-11 bg-background/80 border-border rounded-xl pl-10 pr-10 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
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
            className="w-full h-11 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-650 hover:to-fuchsia-650 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all duration-150 mt-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
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
