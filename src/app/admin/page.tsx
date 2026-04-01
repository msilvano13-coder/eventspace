"use client";

import { useState, useEffect } from "react";
import { Users, Clock, CreditCard, DollarSign, Loader2 } from "lucide-react";
import { showErrorToast } from "@/lib/error-toast";

interface Metrics {
  totalUsers: number;
  activeTrials: number;
  professionalUsers: number;
  diyUsers: number;
  expiredUsers: number;
  mrr: number;
  planDistribution: Record<string, number>;
  recentSignups: { email: string; name: string; plan: string; createdAt: string }[];
}

const planColors: Record<string, string> = {
  trial: "bg-amber-400",
  professional: "bg-emerald-400",
  diy: "bg-blue-400",
  expired: "bg-stone-300",
  pending: "bg-stone-200",
};

const planLabels: Record<string, string> = {
  trial: "Trial",
  professional: "Professional",
  diy: "DIY",
  expired: "Expired",
  pending: "Pending",
};

const planBadgeColors: Record<string, string> = {
  trial: "bg-amber-50 text-amber-700",
  professional: "bg-emerald-50 text-emerald-700",
  diy: "bg-blue-50 text-blue-700",
  expired: "bg-stone-100 text-stone-500",
  pending: "bg-stone-100 text-stone-400",
};

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => showErrorToast("Failed to load metrics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-stone-400" size={24} />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl">
        <p className="text-stone-500">Failed to load metrics.</p>
      </div>
    );
  }

  const totalPlanUsers = Object.values(metrics.planDistribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-stone-800">Metrics</h1>
        <p className="text-sm text-stone-400 mt-1">Overview of your platform</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={Users} label="Total Users" value={metrics.totalUsers} color="bg-blue-50 text-blue-600" />
        <KpiCard icon={Clock} label="Active Trials" value={metrics.activeTrials} color="bg-amber-50 text-amber-600" />
        <KpiCard icon={CreditCard} label="Paid Users" value={metrics.professionalUsers + metrics.diyUsers} color="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={DollarSign} label="MRR" value={`$${metrics.mrr}`} color="bg-rose-50 text-rose-600" />
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-5 mb-8">
        <h2 className="text-sm font-semibold text-stone-700 mb-4">Plan Distribution</h2>
        <div className="flex rounded-full overflow-hidden h-3 mb-4">
          {Object.entries(metrics.planDistribution).map(([plan, count]) =>
            count > 0 ? (
              <div
                key={plan}
                className={`${planColors[plan] || "bg-stone-200"} transition-all`}
                style={{ width: `${(count / totalPlanUsers) * 100}%` }}
              />
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(metrics.planDistribution).map(([plan, count]) => (
            <div key={plan} className="flex items-center gap-2 text-sm text-stone-600">
              <div className={`w-2.5 h-2.5 rounded-full ${planColors[plan] || "bg-stone-200"}`} />
              {planLabels[plan] || plan}: {count}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Signups */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-4">
          Recent Signups <span className="text-stone-400 font-normal">(last 30 days)</span>
        </h2>
        {metrics.recentSignups.length === 0 ? (
          <p className="text-sm text-stone-400">No signups in the last 30 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-400 border-b border-stone-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Signed Up</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentSignups.map((user, i) => (
                  <tr key={i} className="border-b border-stone-50">
                    <td className="py-2.5 text-stone-700">{user.name || "—"}</td>
                    <td className="py-2.5 text-stone-600">{user.email}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeColors[user.plan] || "bg-stone-100 text-stone-500"}`}>
                        {planLabels[user.plan] || user.plan}
                      </span>
                    </td>
                    <td className="py-2.5 text-stone-400">
                      {new Date(user.createdAt).toLocaleDateString()}
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

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-heading font-bold text-stone-800">{value}</p>
      <p className="text-xs text-stone-400 mt-1">{label}</p>
    </div>
  );
}
