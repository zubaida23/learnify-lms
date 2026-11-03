import React from 'react';
import { Bell, UserRound } from 'lucide-react';

const TopNavbar = () => {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <UserRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Welcome back</p>
            <p className="text-xs text-slate-500">Admin User</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;