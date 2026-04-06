"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Calendar, MapPin, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUserId } from "@/lib/supabase/db";
import type { DesignProject } from "@/lib/types";

const STATUS_COLORS: Record<DesignProject["status"], string> = {
  draft: "bg-stone-100 text-stone-600",
  active: "bg-blue-100 text-blue-700",
  generating: "bg-amber-100 text-amber-700",
  complete: "bg-emerald-100 text-emerald-700",
  archived: "bg-stone-200 text-stone-500",
};

export default function DesignProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    clientEmail: "",
    eventDate: "",
    venueName: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("design_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProjects(
        (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          name: row.name as string,
          clientName: row.client_name as string,
          clientEmail: row.client_email as string,
          eventDate: row.event_date as string,
          venueName: row.venue_name as string,
          status: row.status as DesignProject["status"],
          shareToken: row.share_token as string,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch design projects:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const supabase = createClient();
      const userId = await getUserId();
      const shareToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from("design_projects")
        .insert({
          user_id: userId,
          name: form.name.trim(),
          client_name: form.clientName.trim(),
          client_email: form.clientEmail.trim(),
          event_date: form.eventDate || null,
          venue_name: form.venueName.trim(),
          status: "draft",
          share_token: shareToken,
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/planner/designs/${data.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6 md:px-8 flex items-center justify-center min-h-[200px]">
        <Loader2 size={24} className="animate-spin text-stone-300" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-800">
            Design Projects
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            AI-powered venue design briefs
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-soft"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Project grid or empty state */}
      {projects.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles size={48} className="mx-auto text-stone-200 mb-4" />
          <p className="text-lg text-stone-400 font-heading">
            No design projects yet
          </p>
          <p className="text-sm text-stone-300 mt-2">
            Create a project to generate AI-styled venue designs.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 mt-6 bg-rose-400 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/planner/designs/${project.id}`}
              className="bg-white rounded-2xl border border-stone-200 shadow-soft p-5 hover:shadow-card transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-medium text-stone-800 group-hover:text-rose-600 transition-colors truncate">
                  {project.name}
                </h3>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${STATUS_COLORS[project.status]}`}
                >
                  {project.status}
                </span>
              </div>
              {project.venueName && (
                <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1.5">
                  <MapPin size={12} />
                  {project.venueName}
                </div>
              )}
              {project.eventDate && (
                <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1.5">
                  <Calendar size={12} />
                  {new Date(project.eventDate).toLocaleDateString()}
                </div>
              )}
              {project.clientName && (
                <p className="text-xs text-stone-400 mt-2 truncate">
                  Client: {project.clientName}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Create project modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-heading font-semibold text-stone-800">
                New Design Project
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-stone-400" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  Project Name *
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Smith Wedding Reception"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  Venue Name
                </label>
                <input
                  value={form.venueName}
                  onChange={(e) =>
                    setForm({ ...form, venueName: e.target.value })
                  }
                  placeholder="e.g. The Grand Ballroom"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">
                    Client Name
                  </label>
                  <input
                    value={form.clientName}
                    onChange={(e) =>
                      setForm({ ...form, clientName: e.target.value })
                    }
                    placeholder="Jane Smith"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) =>
                      setForm({ ...form, eventDate: e.target.value })
                    }
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">
                  Client Email
                </label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) =>
                    setForm({ ...form, clientEmail: e.target.value })
                  }
                  placeholder="jane@example.com"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!form.name.trim() || creating}
                  className="flex items-center gap-2 bg-rose-400 hover:bg-rose-500 disabled:opacity-50 disabled:pointer-events-none text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
