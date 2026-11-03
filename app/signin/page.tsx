"use client";

import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resolveDashboardPath, normalizeRole } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase/client";
import AuthShell from "../auth/AuthShell";

const APP_REDIRECT_URL = typeof window !== "undefined" ? `${window.location.origin}/signin` : "/signin";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const errorCode = signInError.status === 400 ? "invalid_credentials" : signInError.code ?? "auth_error";

        if (
          errorCode === "email_not_confirmed" ||
          signInError.message.toLowerCase().includes("not confirmed")
        ) {
          throw new Error(
            "Your email address has not been confirmed yet. Please check your inbox and click the verification link."
          );
        }

        throw signInError;
      }

      const user = data?.user;
      if (!user) {
        throw new Error("No user returned after sign in.");
      }

      const profileResult = (await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()) as {
        data: { role?: string } | null;
        error: { code?: string } | null;
      };

      if (profileResult.error && profileResult.error.code !== "PGRST116") {
        throw new Error(profileResult.error.code ?? "Unable to load account role.");
      }

      if (!profileResult.data?.role) {
        throw new Error("Your account is missing a role assignment. Please contact an administrator.");
      }

      const role = normalizeRole(profileResult.data.role);
      setSuccess("Signed in successfully.");
      router.push(resolveDashboardPath(role));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your courses, assignments, and progress dashboard."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-emerald-600 transition hover:text-emerald-700">
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="name@example.com"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <Link href="/signin/reset" className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthShell>
  );
}
