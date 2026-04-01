"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Loader2, Check } from "lucide-react";
import { showErrorToast } from "@/lib/error-toast";

interface Member {
  id: string;
  email: string;
  role: string;
  status: string;
}

interface Props {
  eventId: string;
}

export default function TeamAssignment({ eventId }: Props) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  async function fetchAssignments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/assignments?eventId=${eventId}`);
      const data = await res.json();
      setMembers(data.members ?? []);
      const assigned = new Set<string>(
        (data.assignments ?? []).map((a: { member_id: string }) => a.member_id)
      );
      setAssignedIds(assigned);
    } catch {
      showErrorToast("Failed to fetch team assignments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) fetchAssignments();
  }, [open, eventId]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function toggleMember(memberId: string) {
    setToggling(memberId);
    const isAssigned = assignedIds.has(memberId);

    try {
      const res = await fetch("/api/teams/assignments", {
        method: isAssigned ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, memberId }),
      });
      const data = await res.json();

      if (data.success || !data.error) {
        setAssignedIds((prev) => {
          const next = new Set(prev);
          if (isAssigned) next.delete(memberId);
          else next.add(memberId);
          return next;
        });
      }
    } catch {
      showErrorToast("Failed to update team assignment");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border border-stone-200 px-3.5 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors"
      >
        <Users size={14} />
        <span className="hidden sm:inline">Team</span>
        {assignedIds.size > 0 && (
          <span className="bg-rose-100 text-rose-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
            {assignedIds.size}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <h4 className="text-sm font-semibold text-stone-900">Assign Team Members</h4>
            <p className="text-xs text-stone-400 mt-0.5">Select who can work on this event</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={16} className="animate-spin text-stone-400" />
            </div>
          ) : members.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-stone-400">
              No active team members. Invite members in Settings.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {members.map((member) => {
                const isAssigned = assignedIds.has(member.id);
                const isToggling = toggling === member.id;

                return (
                  <li key={member.id}>
                    <button
                      onClick={() => toggleMember(member.id)}
                      disabled={isToggling}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left"
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isAssigned
                            ? "bg-rose-500 border-rose-500"
                            : "border-stone-300"
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 size={12} className="animate-spin text-white" />
                        ) : isAssigned ? (
                          <Check size={12} className="text-white" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-stone-900 truncate">{member.email}</p>
                        <p className="text-xs text-stone-400 capitalize">{member.role}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
