"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, ChevronDown, Trash2 } from "lucide-react";
import { showErrorToast } from "@/lib/error-toast";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  businessName: string;
  plan: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  eventCount: number;
}

const planBadgeColors: Record<string, string> = {
  trial: "bg-amber-50 text-amber-700",
  professional: "bg-emerald-50 text-emerald-700",
  diy: "bg-blue-50 text-blue-700",
  expired: "bg-stone-100 text-stone-500",
  pending: "bg-stone-100 text-stone-400",
};

const planLabels: Record<string, string> = {
  trial: "Trial",
  professional: "Professional",
  diy: "DIY",
  expired: "Expired",
  pending: "Pending",
};

const planOptions = ["", "trial", "professional", "diy", "expired", "pending"];

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (planFilter) params.set("plan", planFilter);

    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => showErrorToast("Failed to load users"))
      .finally(() => setLoading(false));
  }, [search, planFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  async function extendTrial(userId: string) {
    setActionLoading(userId);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendTrial: true }),
      });
      fetchUsers();
    } catch {
      showErrorToast("Failed to extend trial");
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        showErrorToast(data.error || "Failed to delete user");
        return;
      }
      setDeleteConfirm(null);
      fetchUsers();
    } catch {
      showErrorToast("Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  }

  async function changePlan(userId: string, plan: string) {
    setActionLoading(userId);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      fetchUsers();
    } catch {
      showErrorToast("Failed to change plan");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-stone-800">Users</h1>
        <p className="text-sm text-stone-400 mt-1">
          {loading ? "Loading..." : `${users.length} user${users.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          />
        </div>
        <div className="relative">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="appearance-none bg-white border border-stone-200 rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 cursor-pointer"
          >
            <option value="">All Plans</option>
            {planOptions.filter(Boolean).map((p) => (
              <option key={p} value={p}>
                {planLabels[p] || p}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin text-stone-400" size={20} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="text-left text-stone-400 border-b border-stone-100">
                  <th className="px-5 py-3 font-medium w-[12%]">Name</th>
                  <th className="px-5 py-3 font-medium w-[22%]">Email</th>
                  <th className="px-5 py-3 font-medium w-[8%]">Plan</th>
                  <th className="px-5 py-3 font-medium w-[10%]">Trial Ends</th>
                  <th className="px-5 py-3 font-medium w-[7%]">Events</th>
                  <th className="px-5 py-3 font-medium w-[10%]">Signed Up</th>
                  <th className="px-5 py-3 font-medium w-[31%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-stone-50 hover:bg-stone-50/50">
                    <td className="px-5 py-3 text-stone-700">
                      <div>{user.name || "—"}</div>
                      {user.businessName && (
                        <div className="text-xs text-stone-400">{user.businessName}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-stone-600">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeColors[user.plan] || "bg-stone-100 text-stone-500"}`}>
                        {planLabels[user.plan] || user.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-stone-400">
                      {user.trialEndsAt
                        ? new Date(user.trialEndsAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-stone-600">{user.eventCount}</td>
                    <td className="px-5 py-3 text-stone-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {(user.plan === "trial" || user.plan === "expired") && (
                          <button
                            onClick={() => extendTrial(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? "..." : "+30 days"}
                          </button>
                        )}
                        <select
                          value={user.plan}
                          onChange={(e) => changePlan(user.id, e.target.value)}
                          disabled={actionLoading === user.id}
                          className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 disabled:opacity-50"
                        >
                          {planOptions.filter(Boolean).map((p) => (
                            <option key={p} value={p}>
                              {planLabels[p]}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setDeleteConfirm(deleteConfirm === user.id ? null : user.id)}
                          className="text-xs text-stone-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete account"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {deleteConfirm === user.id && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-red-500">Delete this account?</span>
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === user.id ? "Deleting..." : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-stone-400 px-2 py-1 rounded-lg hover:bg-stone-100"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
