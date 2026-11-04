
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizeRole } from "@/src/lib/auth";
import { supabase } from "@/src/lib/supabase/client";

type Role = "admin" | "instructor" | "student";

type ProfileData = {
  role: string;
};

export default function ProtectedRoute({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole?: Role | Role[];
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess(
      session: Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >["data"]["session"]
    ) {
      if (!session) {
        router.replace("/signin");
        return;
      }

      const profileResult = (await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()) as {
        data: ProfileData | null;
        error: { message: string } | null;
      };

      if (!isMounted) return;

      if (profileResult.error || !profileResult.data) {
        router.replace("/signin");
        return;
      }

      const role = normalizeRole(profileResult.data.role) as Role;

      const allowedRoles = Array.isArray(allowedRole)
        ? allowedRole
        : allowedRole
          ? [allowedRole]
          : [];

      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        router.replace(
          role === "admin"
            ? "/dashboard"
            : role === "instructor"
              ? "/teacher/dashboard"
              : "/student/dashboard"
        );
        return;
      }

      setIsReady(true);
    }

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        await checkAccess(session);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (isMounted) {
          router.replace("/signin");
        }
        return;
      }

      void checkAccess(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [allowedRole, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-sm">
          Checking access...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
