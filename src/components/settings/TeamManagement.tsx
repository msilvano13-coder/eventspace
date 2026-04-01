"use client";

import { useState, useEffect } from "react";
import { Users, Mail, X, Loader2, Clock, UserCheck, Pencil, Check } from "lucide-react";
import { showErrorToast } from "@/lib/error-toast";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  status: "pending" | "active" | "removed";
  role: string;
  invited_at: string;
  accepted_at: string | null;
}

interface Team {
  id: string;
  name: string;
  plan: string;
  max_members: number;
}

const ROLES = [
  { value: "coordinator", label: "Coordinator" },
  { value: "assistant", label: "Assistant" },
  { value: "viewer", label: "Viewer" },
];

export default function TeamManagement() {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [savingName, setSavingName] = useState(false);

  async function fetchTeam() {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeam(data.team);
      setMembers(data.members ?? []);
      if (data.team) setTeamName(data.team.name || "");
    } catch {
      showErrorToast("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTeam();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: `Invitation sent to ${inviteEmail}` });
        setInviteEmail("");
        fetchTeam();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to send invite" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this team member? They will lose access to all assigned events.")) return;

    setRemoving(memberId);
    try {
      const res = await fetch(`/api/teams/members/${memberId}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Team member removed" });
        fetchTeam();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to remove" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setRemoving(null);
    }
  }

  async function handleSaveName() {
    setSavingName(true);
    try {
      const res = await fetch("/api/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName }),
      });
      const data = await res.json();
      if (data.success) {
        setTeam((prev) => prev ? { ...prev, name: teamName.trim() } : prev);
        setEditingName(false);
      } else {
        showErrorToast(data.error || "Failed to update team name");
      }
    } catch {
      showErrorToast("Failed to update team name");
    } finally {
      setSavingName(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    setUpdatingRole(memberId);
    try {
      const res = await fetch(`/api/teams/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();

      if (data.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      } else {
        showErrorToast(data.error || "Failed to update role");
      }
    } catch {
      showErrorToast("Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-400 py-4">
        <Loader2 size={16} className="animate-spin" />
        Loading team...
      </div>
    );
  }

  if (!team) return null;

  const activeCount = members.filter((m) => m.status === "pending" || m.status === "active").length;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-rose-500" />
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="font-heading text-lg font-semibold text-stone-900 border border-stone-200 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-rose-200"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setTeamName(team.name || ""); setEditingName(false); } }}
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 group"
            >
              <h3 className="font-heading text-lg font-semibold text-stone-900">
                {team.name || "Unnamed Team"}
              </h3>
              <Pencil size={12} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            </button>
          )}
        </div>
        <span className="text-sm text-stone-400">
          {activeCount} / {team.max_members} members
        </span>
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="flex gap-2">
        <div className="relative flex-1">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="team@example.com"
            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          />
        </div>
        <button
          type="submit"
          disabled={inviting || !inviteEmail.trim() || activeCount >= team.max_members}
          className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {inviting ? <Loader2 size={14} className="animate-spin" /> : null}
          Invite
        </button>
      </form>

      {/* Status message */}
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      {/* Member list */}
      {members.length === 0 ? (
        <p className="text-sm text-stone-400 py-4 text-center">
          No team members yet. Invite someone to get started.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 text-xs font-medium">
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  {member.name ? (
                    <>
                      <p className="text-sm font-medium text-stone-900">{member.name}</p>
                      <p className="text-xs text-stone-400">{member.email}</p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-stone-900">{member.email}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {member.status === "active" ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <UserCheck size={12} /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Clock size={12} /> Pending
                      </span>
                    )}
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      disabled={updatingRole === member.id}
                      className="text-xs text-stone-500 bg-transparent border-none cursor-pointer hover:text-stone-700 focus:outline-none disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(member.id)}
                disabled={removing === member.id}
                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove member"
              >
                {removing === member.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <X size={14} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
