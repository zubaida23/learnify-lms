"use client";

import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import AuthShell from "../../auth/AuthShell";

const APP_REDIRECT_URL = typeof window !== "undefined" ? `${window.location.origin}/signin` : "/signin";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: APP_REDIRECT_URL,
      });

      if (resetError) {
        throw resetError;
      }

      setMessage("Password reset email sent. Please check your inbox.");
      setEmail("");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Unable to send reset email.";
      setError(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="Send a secure reset link to your email address."
      footer={
        <>
          <Link href="/signin" className="inline-flex items-center gap-2 font-semibold text-emerald-600 transition hover:text-emerald-700">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
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

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <div>
          <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="reset-email"
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending link..." : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}
