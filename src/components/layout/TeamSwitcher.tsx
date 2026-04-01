"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Building2, User, Check } from "lucide-react";
import { showErrorToast } from "@/lib/error-toast";
import { getTeamContext, setTeamContext, clearTeamContext, type TeamContext } from "@/lib/team-context";

interface TeamMembership {
  id: string;
  team_id: string;
  teams: {
    id: string;
    owner_id: string;
    name: string;
  };
}

export default function TeamSwitcher() {
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [currentCtx, setCurrentCtx] = useState<TeamContext | null>(null);
  const [open, setOpen] = useState(false);
  const [, setHasOwnTeam] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentCtx(getTeamContext());

    async function fetchTeams() {
      try {
        const res = await fetch("/api/teams");
        const data = await res.json();
        setMemberships(data.memberships ?? []);
        setHasOwnTeam(!!data.team);
      } catch {
        showErrorToast("Failed to load team memberships");
      }
    }
    fetchTeams();
  }, []);

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

  // Only show if user has team memberships
  if (memberships.length === 0) return null;

  function switchToOwn() {
    clearTeamContext();
    setCurrentCtx(null);
    setOpen(false);
    window.location.reload();
  }

  function switchToTeam(membership: TeamMembership) {
    const ctx: TeamContext = {
      teamId: membership.teams.id,
      ownerId: membership.teams.owner_id,
      ownerName: membership.teams.name || "Team",
    };
    setTeamContext(ctx);
    setCurrentCtx(ctx);
    setOpen(false);
    window.location.reload();
  }

  const currentLabel = currentCtx ? currentCtx.ownerName : "My Account";

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 rounded-xl transition-colors"
      >
        {currentCtx ? (
          <Building2 size={16} className="text-rose-500 shrink-0" />
        ) : (
          <User size={16} className="text-stone-400 shrink-0" />
        )}
        <span className="truncate flex-1 text-left font-medium">{currentLabel}</span>
        <ChevronDown size={14} className={`text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* My Account option */}
          <button
            onClick={switchToOwn}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-stone-50 transition-colors text-left"
          >
            <User size={16} className="text-stone-400 shrink-0" />
            <span className="flex-1 truncate">My Account</span>
            {!currentCtx && <Check size={14} className="text-rose-500 shrink-0" />}
          </button>

          <div className="border-t border-stone-100" />

          {/* Team memberships */}
          {memberships.map((m) => {
            const isActive = currentCtx?.teamId === m.teams.id;
            return (
              <button
                key={m.id}
                onClick={() => switchToTeam(m)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-stone-50 transition-colors text-left"
              >
                <Building2 size={16} className="text-rose-500 shrink-0" />
                <span className="flex-1 truncate">{m.teams.name || "Team"}</span>
                {isActive && <Check size={14} className="text-rose-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
