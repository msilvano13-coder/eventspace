"use client";

import { useParams } from "next/navigation";
import { useEvent, useEventSubEntities, usePlannerProfile, useEventsLoading } from "@/hooks/useStore";
import EventLoader from "@/components/ui/EventLoader";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Layout,
  FileText,
  Clock,
  Users,
  Store,
  Palette,
  CheckSquare,
  Check,
  Circle,
  Image,
  Eye,
} from "lucide-react";
function fmt12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  catering: "bg-orange-50 text-orange-600",
  photography: "bg-violet-50 text-violet-600",
  videography: "bg-purple-50 text-purple-600",
  florist: "bg-pink-50 text-pink-600",
  "flowers/decor": "bg-pink-50 text-pink-600",
  dj: "bg-blue-50 text-blue-600",
  "music/entertainment": "bg-blue-50 text-blue-600",
  venue: "bg-emerald-50 text-emerald-600",
  planner: "bg-rose-50 text-rose-600",
  rentals: "bg-amber-50 text-amber-600",
  cake: "bg-yellow-50 text-yellow-600",
  officiant: "bg-teal-50 text-teal-600",
  "hair/makeup": "bg-fuchsia-50 text-fuchsia-600",
  transportation: "bg-cyan-50 text-cyan-600",
  stationery: "bg-lime-50 text-lime-600",
};

export default function VendorPortalPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = useEvent(eventId);
  const loading = useEventsLoading();
  useEventSubEntities(eventId, ["timeline", "schedule", "vendors", "guests", "files"]);
  const profile = usePlannerProfile();

  if (loading) return <EventLoader />;

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <p className="text-stone-500 mb-2">Event not found or link is invalid.</p>
          <p className="text-xs text-stone-400">Please check your link and try again.</p>
        </div>
      </div>
    );
  }

  const vendors = event.vendors ?? [];
  const guests = event.guests ?? [];
  const schedule = event.schedule ?? [];
  const todos = [...(event.timeline ?? [])].sort((a, b) => a.order - b.order);
  const completedCount = todos.filter((t) => t.completed).length;
  const acceptedGuests = guests.filter((g) => g.rsvp === "accepted");
  const totalHeadCount = acceptedGuests.reduce((sum, g) => sum + 1 + (g.plusOne ? 1 : 0), 0);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-heading font-bold text-white text-sm shrink-0"
              style={{ backgroundColor: profile.brandColor || "#e88b8b" }}
            >
              {(profile.businessName || profile.plannerName || "E")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-heading font-semibold text-stone-800 truncate">{event.name}</h1>
            <p className="text-xs text-stone-400">
              {profile.businessName || profile.plannerName || "Vendor Portal"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-stone-100 text-stone-500 px-3 py-1.5 rounded-full">
            <Eye size={12} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Read Only</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">

        {/* Date & Venue */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-stone-600">
            <span className="flex items-center gap-2">
              <Calendar size={15} className="text-rose-400 shrink-0" />
              <span className="font-medium">
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                })}
              </span>
            </span>
            <span className="hidden sm:block text-stone-200">·</span>
            <span className="flex items-center gap-2">
              <MapPin size={15} className="text-rose-400 shrink-0" />
              <span>{event.venue}</span>
            </span>
          </div>
        </div>

        {/* Color Palette */}
        {(event.colorPalette ?? []).length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={15} className="text-rose-400" />
              <h2 className="font-heading font-semibold text-stone-800 text-sm">Color Palette</h2>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {(event.colorPalette ?? []).map((color, i) => (
                <div key={i} className="text-center">
                  <div
                    className="w-10 h-10 rounded-xl border-2 border-white shadow-sm ring-1 ring-stone-200"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                  <p className="text-[9px] text-stone-400 mt-1 font-mono">{color}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(event.floorPlanJSON || (event.floorPlans ?? []).some((fp: any) => fp.json)) && (
            <Link
              href={`/client/${event.id}/floorplan`}
              className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
            >
              <Layout size={20} className="text-rose-400 mb-2" />
              <h3 className="font-heading font-semibold text-stone-800 group-hover:text-rose-500 text-sm">Floor Plan</h3>
              <p className="text-xs text-stone-400 mt-1">View layout</p>
            </Link>
          )}
          <Link
            href={`/client/${event.id}/moodboard`}
            className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
          >
            <Image size={20} className="text-pink-400 mb-2" />
            <h3 className="font-heading font-semibold text-stone-800 group-hover:text-pink-500 text-sm">Mood Board</h3>
            <p className="text-xs text-stone-400 mt-1">{(event.moodBoard ?? []).length} images</p>
          </Link>
          <Link
            href={`/client/${event.id}/files`}
            className="bg-white border border-stone-200 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all group"
          >
            <FileText size={20} className="text-blue-400 mb-2" />
            <h3 className="font-heading font-semibold text-stone-800 group-hover:text-blue-500 text-sm">Files</h3>
            <p className="text-xs text-stone-400 mt-1">{(event.files ?? []).length} shared</p>
          </Link>
        </div>

        {/* Day-Of Timeline */}
        {schedule.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-stone-100">
              <Clock size={15} className="text-violet-400" />
              <h2 className="font-heading font-semibold text-stone-800 text-sm">Day-of Timeline</h2>
              <span className="text-xs text-stone-400">({schedule.length} moments)</span>
            </div>
            <div className="divide-y divide-stone-50">
              {[...schedule].sort((a, b) => (a.time || "").localeCompare(b.time || "")).map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="text-xs font-medium text-violet-500 w-16 shrink-0 pt-0.5">
                    {item.time ? fmt12(item.time) : "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-700">{item.title}</p>
                    {item.notes && <p className="text-xs text-stone-400 mt-0.5">{item.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guests Summary */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-amber-400" />
            <h2 className="font-heading font-semibold text-stone-800 text-sm">Guest Summary</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Total Invited</p>
              <p className="text-lg font-heading font-bold text-stone-800">{guests.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Accepted</p>
              <p className="text-lg font-heading font-bold text-emerald-600">{acceptedGuests.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Head Count</p>
              <p className="text-lg font-heading font-bold text-stone-800">{totalHeadCount}</p>
            </div>
          </div>
        </div>

        {/* Vendor Team — names & contact only, no pricing */}
        {vendors.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-stone-100">
              <Store size={15} className="text-orange-400" />
              <h2 className="font-heading font-semibold text-stone-800 text-sm">Vendor Team</h2>
              <span className="text-xs text-stone-400">({vendors.length})</span>
            </div>
            <div className="divide-y divide-stone-50">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[vendor.category] ?? "bg-stone-100 text-stone-500"}`}>
                      {vendor.category}
                    </span>
                    <span className="text-sm font-medium text-stone-800">{vendor.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                    {vendor.contact && <span>{vendor.contact}</span>}
                    {vendor.phone && <span>{vendor.phone}</span>}
                    {vendor.email && <span>{vendor.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* To-Do Progress */}
        {todos.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-emerald-400" />
                <h2 className="font-heading font-semibold text-stone-800 text-sm">Planning Progress</h2>
              </div>
              <span className="text-xs text-stone-400 font-medium">{completedCount}/{todos.length} complete</span>
            </div>
            <div className="divide-y divide-stone-50">
              {todos.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                  {item.completed ? (
                    <Check size={15} className="text-emerald-500 shrink-0" />
                  ) : (
                    <Circle size={15} className="text-stone-300 shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${item.completed ? "line-through text-stone-400" : "text-stone-700"}`}>
                    {item.title}
                  </span>
                  {item.dueDate && (
                    <span className="text-xs text-stone-400 shrink-0">
                      {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-[10px] text-stone-300 uppercase tracking-widest">
            Powered by EventSpace
          </p>
        </div>
      </div>
    </div>
  );
}
