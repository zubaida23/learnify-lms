"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { resolveDashboardPath } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase/client";

export default function RootRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function redirectForSession(session: { user: { id: string } }) {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        router.replace("/dashboard");
        return;
      }

      router.replace(
        resolveDashboardPath(
          (data as { role?: string } | null)?.role ?? "student"
        )
      );
    }

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        router.replace("/signin");
        return;
      }

      await redirectForSession(session);
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (isMounted) router.replace("/signin");
        return;
      }

      if (isMounted) {
        void redirectForSession(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-sm">
        Loading Learnify...
      </div>
    </main>
  );
}
