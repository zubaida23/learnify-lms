
"use client";

import { supabase } from "../../src/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at: string;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [showAddForm, setShowAddForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("student");
  const [editStatus, setEditStatus] = useState("active");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const settingsSupabase = supabase as any;

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await settingsSupabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in to access User Management.");
      }

      const { data: isAdmin, error: adminError } =
        await settingsSupabase.rpc("is_current_user_admin");

      if (adminError) throw adminError;

      if (!isAdmin) {
        throw new Error("Access denied. Only administrators can manage users.");
      }

      const { data, error: fetchError } = await settingsSupabase
        .from("profiles")
        .select("id, full_name, email, role, status, created_at")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setUsers((data || []) as UserProfile[]);
    } catch (err: any) {
      setError(err.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function getAccessToken() {
    const {
      data: { session },
      error: sessionError,
    } = await settingsSupabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session?.access_token) {
      throw new Error("Your session has expired. Please log in again.");
    }

    return session.access_token;
  }

  // ADD USER
  async function handleAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setCreating(true);

    try {
      const token = await getAccessToken();

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to create user.");
      }

      setSuccess("User created successfully!");
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("student");
      setShowAddForm(false);

      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  // OPEN EDIT FORM
  function openEditForm(user: UserProfile) {
    setError("");
    setSuccess("");
    setShowAddForm(false);

    setEditingUser(user);
    setEditFullName(user.full_name || "");
    setEditEmail(user.email || "");
    setEditRole(user.role || "student");
    setEditStatus(user.status || "active");
  }

  // EDIT USER
  async function handleEditUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editingUser) return;

    setSavingEdit(true);

    try {
      const token = await getAccessToken();

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingUser.id,
          full_name: editFullName.trim(),
          email: editEmail.trim(),
          role: editRole,
          status: editStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update user.");
      }

      setSuccess("User updated successfully!");
      setEditingUser(null);

      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSavingEdit(false);
    }
  }

  // DELETE USER
  async function handleDeleteUser(user: UserProfile) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${
        user.full_name || user.email || "this user"
      }?\n\nThis action cannot be undone. Related student enrollments, quiz attempts, submissions and progress records may also be deleted.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingUserId(user.id);

    try {
      const token = await getAccessToken();

      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete user.");
      }

      setSuccess("User deleted successfully!");

      if (editingUser?.id === user.id) {
        setEditingUser(null);
      }

      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setDeletingUserId(null);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        (user.full_name || "").toLowerCase().includes(searchText) ||
        (user.email || "").toLowerCase().includes(searchText);

      const matchesRole =
        roleFilter === "all" ||
        (user.role || "").toLowerCase() === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const getRoleStyle = (userRole: string | null) => {
    switch ((userRole || "").toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-700";
      case "instructor":
        return "bg-blue-100 text-blue-700";
      case "student":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const counts = {
    total: users.length,
    admins: users.filter((u) => u.role?.toLowerCase() === "admin").length,
    instructors: users.filter((u) => u.role?.toLowerCase() === "instructor").length,
    students: users.filter((u) => u.role?.toLowerCase() === "student").length,
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              LEARNIFY LMS
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              User Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage administrators, instructors and students.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setError("");
                setSuccess("");
                setEditingUser(null);
                setShowAddForm(true);
              }}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              + Add New User
            </button>

            <button
              onClick={loadUsers}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? "Loading..." : "↻ Refresh Users"}
            </button>
          </div>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* ADD USER FORM */}
        {showAddForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add New User</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a new Learnify LMS account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Select Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creating ? "Creating User..." : "Create User"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  disabled={creating}
                  className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* EDIT USER FORM */}
        {editingUser && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit User</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update user account information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={savingEdit}
                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    User Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Inactive accounts will be blocked from logging in.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingEdit ? "Saving Changes..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={savingEdit}
                  className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* STATISTICS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Users", value: counts.total, icon: "👥" },
            { label: "Administrators", value: counts.admins, icon: "🛡️" },
            { label: "Instructors", value: counts.instructors, icon: "👩‍🏫" },
            { label: "Students", value: counts.students, icon: "🎓" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{card.label}</p>
                <span className="text-2xl">{card.icon}</span>
              </div>

              <p className="mt-3 text-3xl font-bold text-slate-900">
                {loading ? "—" : card.value}
              </p>
            </div>
          ))}
        </div>

        {/* USERS TABLE */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900">
              All Platform Users
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              User records fetched directly from Supabase.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrators</option>
                <option value="instructor">Instructors</option>
                <option value="student">Students</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Loading users from database...
            </div>
          ) : !error && filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No users found.
            </div>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                            {(user.full_name || user.email || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span className="font-semibold text-slate-800">
                            {user.full_name || "Unnamed User"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {user.email || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getRoleStyle(user.role)}`}
                        >
                          {user.role || "Unknown"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.status?.toLowerCase() === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {user.status || "Unknown"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "—"}
                      </td>

                      {/* EDIT AND DELETE ACTIONS */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(user)}
                            disabled={deletingUserId !== null}
                            className="rounded-lg bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Edit User
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingUserId !== null}
                            className="rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingUserId === user.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!loading && !error && (
            <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-500">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-400">
          Learnify LMS · User Management
        </p>
      </div>
    </main>
  );
}
