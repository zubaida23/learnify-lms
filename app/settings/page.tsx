
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "../components/PageShell";
import { supabase } from "@/src/lib/supabase/client";

type SettingsTab =
  | "general"
  | "security"
  | "users"
  | "notifications"
  | "system";

const settingsSupabase = supabase as any;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const [platformName, setPlatformName] = useState("Learnify LMS");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [language, setLanguage] = useState("English");

  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [twoFactor, setTwoFactor] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [resultNotifications, setResultNotifications] = useState(true);
  const [assignmentNotifications, setAssignmentNotifications] =
    useState(true);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const tabs = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "security", label: "Security", icon: "🛡️" },
    { id: "users", label: "User Management", icon: "👥" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "system", label: "System Info", icon: "💻" },
  ] as const;

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const { data: userData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !userData.user) {
          throw new Error("Please log in to access platform settings.");
        }

        const { data: adminStatus, error: adminError } =
          await settingsSupabase.rpc("is_current_user_admin");

        if (adminError) {
          throw new Error(
            `Admin verification failed: ${adminError.message}`
          );
        }

        if (adminStatus !== true) {
          throw new Error(
            "Your account does not have administrator permissions."
          );
        }

        if (!isMounted) return;

        setIsAdmin(true);

        const { data, error } = await settingsSupabase
          .from("platform_settings")
          .select(
            "platform_name, timezone, default_language, two_factor_enabled, session_timeout, email_notifications, result_notifications, assignment_notifications"
          )
          .eq("id", 1)
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (!isMounted) return;

        setPlatformName(data.platform_name ?? "Learnify LMS");
        setTimezone(data.timezone ?? "Asia/Karachi");
        setLanguage(data.default_language ?? "English");

        setTwoFactor(data.two_factor_enabled ?? false);
        setSessionTimeout(String(data.session_timeout ?? 30));

        setEmailNotifications(data.email_notifications ?? true);
        setResultNotifications(data.result_notifications ?? true);
        setAssignmentNotifications(
          data.assignment_notifications ?? true
        );
      } catch (error) {
        if (isMounted) {
          setIsAdmin(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load platform settings."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingSettings(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveSettings() {
    setSavedMessage("");
    setErrorMessage("");

    if (!isAdmin) {
      setErrorMessage("Only administrators can save platform settings.");
      return;
    }

    if (activeTab === "general" && !platformName.trim()) {
      setErrorMessage("Platform name cannot be empty.");
      return;
    }

    setSavingSettings(true);

    try {
      const { data: userData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !userData.user) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const { data: adminStatus, error: adminError } =
        await settingsSupabase.rpc("is_current_user_admin");

      if (adminError) {
        throw new Error(adminError.message);
      }

      if (adminStatus !== true) {
        setIsAdmin(false);
        throw new Error(
          "Your account does not have administrator permissions."
        );
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: userData.user.id,
      };

      if (activeTab === "general") {
        updates.platform_name = platformName.trim();
        updates.timezone = timezone;
        updates.default_language = language;
      }

      if (activeTab === "security") {
        updates.two_factor_enabled = twoFactor;
        updates.session_timeout = Number(sessionTimeout);
      }

      if (activeTab === "notifications") {
        updates.email_notifications = emailNotifications;
        updates.result_notifications = resultNotifications;
        updates.assignment_notifications = assignmentNotifications;
      }

      const { error } = await settingsSupabase
        .from("platform_settings")
        .update(updates)
        .eq("id", 1);

      if (error) {
        throw new Error(error.message);
      }

      if (activeTab === "general") {
        setPlatformName(platformName.trim());
      }

      setSavedMessage("Settings saved successfully!");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save settings."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  function Toggle({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
  }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-pressed={enabled}
        className={`relative h-6 w-11 rounded-full transition ${
          enabled ? "bg-emerald-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    );
  }

  const saveableTab =
    activeTab === "general" ||
    activeTab === "security" ||
    activeTab === "notifications";

  // Loading screen: Do not show settings before admin verification.
  if (loadingSettings) {
    return (
      <PageShell
        title="Settings"
        description="Checking your account permissions."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Verifying account permissions...
          </p>
        </div>
      </PageShell>
    );
  }

  // Only administrators can access platform settings.
  if (!isAdmin) {
    return (
      <PageShell
        title="Settings"
        description="Manage your Learnify LMS platform preferences."
      >
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl">
            🛡️
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Administrator Access Required
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Platform settings are restricted to administrators.
            Please contact your administrator if you need assistance.
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Settings"
      description="Manage your Learnify LMS platform preferences."
    >
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm font-medium text-emerald-100">
            PLATFORM CONTROL CENTER
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Manage your platform
          </h2>

          <p className="mt-2 max-w-xl text-sm text-emerald-50">
            Customize general preferences, security options, user settings
            and notifications from one place.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Settings Menu
            </p>

            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSavedMessage("");
                    setErrorMessage("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {errorMessage && (
              <p className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {activeTab === "general" && (
              <section>
                <h2 className="text-xl font-bold text-slate-900">
                  General Settings
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configure your platform identity and regional preferences.
                </p>

                <div className="mt-7 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Platform Name
                    </label>

                    <input
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      disabled={savingSettings}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Timezone
                    </label>

                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      disabled={savingSettings}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-100"
                    >
                      <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                      <option value="UTC">UTC</option>
                      <option value="Asia/Dubai">Asia/Dubai</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="America/New_York">America/New York</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Default Language
                    </label>

                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      disabled={savingSettings}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-100"
                    >
                      <option value="English">English</option>
                      <option value="Urdu">Urdu</option>
                    </select>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "security" && (
              <section>
                <h2 className="text-xl font-bold text-slate-900">
                  Security & Privacy
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review your platform security preferences.
                </p>

                <div className="mt-7 divide-y divide-slate-100">
                  <div className="flex items-center justify-between gap-4 py-5">
                    <div>
                      <p className="font-semibold text-slate-800">
                        Two-Factor Authentication
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Save your preferred two-factor authentication setting.
                        Actual login verification must be configured separately.
                      </p>
                    </div>

                    <Toggle enabled={twoFactor} onChange={setTwoFactor} />
                  </div>

                  <div className="py-5">
                    <label className="block font-semibold text-slate-800">
                      Session Timeout
                    </label>

                    <p className="mt-1 text-sm text-slate-500">
                      Preferred session duration in minutes.
                    </p>

                    <select
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm sm:max-w-xs"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="120">120 minutes</option>
                    </select>
                  </div>

                  <div className="py-5">
                    <p className="font-semibold text-slate-800">
                      Password Policy
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Use strong, unique passwords for all platform accounts.
                      Actual password rules must be configured in your
                      authentication provider.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "users" && (
              <section>
                <h2 className="text-xl font-bold text-slate-900">
                  User Management
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manage the different types of platform accounts.
                </p>

                <div className="mt-7 space-y-3">
                  {[
                    {
                      title: "Administrators",
                      description: "Manage platform settings and users.",
                      icon: "🛡️",
                    },
                    {
                      title: "Instructors",
                      description: "Manage courses, quizzes and results.",
                      icon: "👩‍🏫",
                    },
                    {
                      title: "Students",
                      description: "Access courses, lessons and assessments.",
                      icon: "🎓",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center gap-4 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                        {item.icon}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href="/user-management"
                  className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Open User Management
                </Link>
              </section>
            )}

            {activeTab === "notifications" && (
              <section>
                <h2 className="text-xl font-bold text-slate-900">
                  Notification Preferences
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose which notification preferences you want to enable.
                </p>

                <div className="mt-7 divide-y divide-slate-100">
                  {[
                    {
                      title: "Email Notifications",
                      description: "General platform email alerts.",
                      value: emailNotifications,
                      setter: setEmailNotifications,
                    },
                    {
                      title: "Quiz Results",
                      description: "Notifications about assessment results.",
                      value: resultNotifications,
                      setter: setResultNotifications,
                    },
                    {
                      title: "Assignment Updates",
                      description: "Notifications about assignment activity.",
                      value: assignmentNotifications,
                      setter: setAssignmentNotifications,
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between gap-4 py-5"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {item.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {item.description}
                        </p>
                      </div>

                      <Toggle
                        enabled={item.value}
                        onChange={item.setter}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "system" && (
              <section>
                <h2 className="text-xl font-bold text-slate-900">
                  System Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Overview of your LMS technology stack.
                </p>

                <div className="mt-7 space-y-3">
                  {[
                    ["Platform", platformName],
                    ["Frontend", "Next.js 16"],
                    ["Language", "TypeScript"],
                    ["Database", "Supabase"],
                    ["Authentication", "Supabase Auth"],
                    ["Application", "Learning Management System"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-col justify-between gap-1 rounded-xl bg-slate-50 p-4 sm:flex-row"
                    >
                      <span className="text-sm text-slate-500">
                        {label}
                      </span>

                      <span className="text-sm font-semibold text-slate-800">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {saveableTab && (
              <div className="mt-8 border-t border-slate-100 pt-5">
                {savedMessage && (
                  <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    {savedMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingSettings ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            )}

            {!saveableTab && activeTab === "users" && (
              <p className="mt-8 border-t border-slate-100 pt-5 text-sm text-slate-500">
                Manage platform accounts from the User Management section.
              </p>
            )}

            {!saveableTab && activeTab === "system" && (
              <p className="mt-8 border-t border-slate-100 pt-5 text-sm text-slate-500">
                Your Learnify LMS technology information.
              </p>
            )}
          </main>
        </div>

        <div className="text-sm">
          <Link
            href="/dashboard"
            className="font-semibold text-emerald-700 hover:text-emerald-800"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
