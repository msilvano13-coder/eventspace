"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, User, Calendar, Mail, CreditCard } from "lucide-react";
import { showErrorToast } from "@/lib/error-toast";

interface LookupProfile {
  id: string;
  email: string;
  planner_name: string;
  business_name: string;
  plan: string;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface LookupEvent {
  id: string;
  name: string;
  date: string;
  client_name: string;
  status: string;
  archived_at: string | null;
  created_at: string;
}

interface WebhookEvent {
  id: string;
  stripe_event_id: string;
  event_type: string;
  processed_at: string;
}

interface AuditEntry {
  id: string;
  event_id: string;
  contract_id: string;
  actor_type: string;
  action: string;
  ip_address: string | null;
  created_at: string;
}

const planBadgeColors: Record<string, string> = {
  trial: "bg-amber-50 text-amber-700",
  professional: "bg-emerald-50 text-emerald-700",
  diy: "bg-blue-50 text-blue-700",
  expired: "bg-stone-100 text-stone-500",
  pending: "bg-stone-100 text-stone-400",
};

const statusColors: Record<string, string> = {
  planning: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-stone-100 text-stone-500",
};

export default function AdminSupport() {
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupProfile, setLookupProfile] = useState<LookupProfile | null>(null);
  const [lookupEvents, setLookupEvents] = useState<LookupEvent[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [extendLoading, setExtendLoading] = useState(false);

  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/support/webhooks")
      .then((r) => r.json())
      .then((data) => setWebhooks(data.webhooks || []))
      .catch(() => showErrorToast("Failed to load webhooks"))
      .finally(() => setWebhooksLoading(false));

    fetch("/api/admin/support/audit")
      .then((r) => r.json())
      .then((data) => setAuditEntries(data.entries || []))
      .catch(() => showErrorToast("Failed to load audit log"))
      .finally(() => setAuditLoading(false));
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupEmail.trim()) return;

    setLookupLoading(true);
    setLookupError("");
    setLookupProfile(null);
    setLookupEvents([]);

    try {
      const res = await fetch(`/api/admin/support/lookup?email=${encodeURIComponent(lookupEmail.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setLookupError(data.error || "User not found");
        return;
      }

      setLookupProfile(data.profile);
      setLookupEvents(data.events || []);
    } catch {
      setLookupError("Failed to look up user");
    } finally {
      setLookupLoading(false);
    }
  }

  async function extendTrial() {
    if (!lookupProfile) return;
    setExtendLoading(true);
    try {
      await fetch(`/api/admin/users/${lookupProfile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendTrial: true }),
      });
      // Re-fetch the profile
      const res = await fetch(`/api/admin/support/lookup?email=${encodeURIComponent(lookupProfile.email)}`);
      const data = await res.json();
      if (res.ok) {
        setLookupProfile(data.profile);
        setLookupEvents(data.events || []);
      }
    } catch {
      showErrorToast("Failed to extend trial");
    } finally {
      setExtendLoading(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-stone-800">Support</h1>
        <p className="text-sm text-stone-400 mt-1">Look up users and view system logs</p>
      </div>

      {/* User Lookup */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-4">User Lookup</h2>
        <form onSubmit={handleLookup} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="email"
              placeholder="Enter user email..."
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading || !lookupEmail.trim()}
            className="bg-rose-400 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-rose-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {lookupLoading ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
            Look Up
          </button>
        </form>

        {lookupError && (
          <p className="text-sm text-red-500 mb-4">{lookupError}</p>
        )}

        {lookupProfile && (
          <div className="space-y-4">
            {/* Profile Card */}
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-stone-400" />
                    <span className="font-medium text-stone-700">{lookupProfile.planner_name || "No name"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeColors[lookupProfile.plan] || "bg-stone-100 text-stone-500"}`}>
                      {lookupProfile.plan}
                    </span>
                  </div>
                  <div className="text-sm text-stone-500 space-y-1">
                    <p>{lookupProfile.email}</p>
                    {lookupProfile.business_name && <p>{lookupProfile.business_name}</p>}
                    <p>Signed up: {new Date(lookupProfile.created_at).toLocaleDateString()}</p>
                    {lookupProfile.trial_ends_at && (
                      <p>Trial ends: {new Date(lookupProfile.trial_ends_at).toLocaleDateString()}</p>
                    )}
                    {lookupProfile.stripe_customer_id && (
                      <p className="flex items-center gap-1">
                        <CreditCard size={12} />
                        Stripe: {lookupProfile.stripe_customer_id}
                      </p>
                    )}
                  </div>
                </div>
                {(lookupProfile.plan === "trial" || lookupProfile.plan === "expired") && (
                  <button
                    onClick={extendTrial}
                    disabled={extendLoading}
                    className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    {extendLoading ? "..." : "Extend Trial +30 days"}
                  </button>
                )}
              </div>
            </div>

            {/* User's Events */}
            {lookupEvents.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
                  Events ({lookupEvents.length})
                </h3>
                <div className="space-y-2">
                  {lookupEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-3">
                        <Calendar size={14} className="text-stone-400" />
                        <span className="text-stone-700">{event.name}</span>
                        {event.client_name && <span className="text-stone-400">({event.client_name})</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-stone-400 text-xs">
                          {event.date ? new Date(event.date).toLocaleDateString() : "No date"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[event.status] || "bg-stone-100 text-stone-500"}`}>
                          {event.status}
                        </span>
                        {event.archived_at && (
                          <span className="text-xs text-stone-400">archived</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stripe Webhooks */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-4">Recent Stripe Webhooks</h2>
        {webhooksLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="animate-spin text-stone-400" size={18} />
          </div>
        ) : webhooks.length === 0 ? (
          <p className="text-sm text-stone-400">No webhook events recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-400 border-b border-stone-100">
                  <th className="pb-2 font-medium">Event ID</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Processed</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="border-b border-stone-50">
                    <td className="py-2 text-stone-500 font-mono text-xs">
                      {wh.stripe_event_id.slice(0, 24)}...
                    </td>
                    <td className="py-2 text-stone-600">{wh.event_type}</td>
                    <td className="py-2 text-stone-400">
                      {new Date(wh.processed_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract Audit Log */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-4">Contract Audit Log</h2>
        {auditLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="animate-spin text-stone-400" size={18} />
          </div>
        ) : auditEntries.length === 0 ? (
          <p className="text-sm text-stone-400">No audit log entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stone-400 border-b border-stone-100">
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Actor</th>
                  <th className="pb-2 font-medium">Contract</th>
                  <th className="pb-2 font-medium">IP</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-stone-50">
                    <td className="py-2 text-stone-600">
                      {entry.action.replace(/_/g, " ")}
                    </td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${entry.actor_type === "planner" ? "bg-blue-50 text-blue-600" : "bg-stone-100 text-stone-500"}`}>
                        {entry.actor_type}
                      </span>
                    </td>
                    <td className="py-2 text-stone-500 font-mono text-xs">
                      {entry.contract_id.slice(0, 8)}...
                    </td>
                    <td className="py-2 text-stone-400 text-xs">{entry.ip_address || "—"}</td>
                    <td className="py-2 text-stone-400">
                      {new Date(entry.created_at).toLocaleString()}
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
