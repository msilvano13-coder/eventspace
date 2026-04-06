"use client";

import { useEvents } from "@/hooks/useStore";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusDots: Record<string, string> = {
  planning: "bg-amber-400",
  confirmed: "bg-emerald-400",
  completed: "bg-stone-400",
};

export default function CalendarPage() {
  const events = useEvents();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prev() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function next() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push({ date: d, month: m, year: y, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: d, month, year, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const m = month === 11 ? 0 : month + 1;
        const y = month === 11 ? year + 1 : year;
        days.push({ date: d, month: m, year: y, isCurrentMonth: false });
      }
    }

    return days;
  }, [year, month]);

  // Map dates to events
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const event of events) {
      const d = new Date(event.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const isToday = (d: { date: number; month: number; year: number }) =>
    d.date === today.getDate() && d.month === today.getMonth() && d.year === today.getFullYear();

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-stone-800">Calendar</h1>
          <p className="text-sm text-stone-400 mt-1">{events.length} event{events.length !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex items-center gap-1.5 text-[11px] text-stone-400 mr-3">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Planning
            <span className="w-2 h-2 rounded-full bg-emerald-400 ml-2" /> Confirmed
            <span className="w-2 h-2 rounded-full bg-stone-400 ml-2" /> Completed
          </span>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-heading font-semibold text-stone-800">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={goToday}
            className="text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-stone-100">
          {DAY_LABELS.map((day) => (
            <div key={day} className="py-2.5 text-center text-xs font-medium text-stone-400">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const key = `${day.year}-${day.month}-${day.date}`;
            const dayEvents = eventsByDate.get(key) ?? [];
            const todayClass = isToday(day);

            return (
              <div
                key={key}
                className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-stone-100 p-1.5 sm:p-2 ${
                  !day.isCurrentMonth ? "bg-stone-50/50" : ""
                } ${idx % 7 === 0 ? "border-l-0" : ""}`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  todayClass
                    ? "bg-rose-400 text-white"
                    : day.isCurrentMonth
                      ? "text-stone-700"
                      : "text-stone-300"
                }`}>
                  {day.date}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((evt) => (
                    <Link
                      key={evt.id}
                      href={`/planner/${evt.id}`}
                      className="block group"
                    >
                      <div className="flex items-center gap-1 px-1 py-0.5 rounded-md hover:bg-stone-50 transition-colors">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDots[evt.status] ?? "bg-stone-300"}`} />
                        <span className="text-[11px] text-stone-600 group-hover:text-rose-500 truncate leading-tight transition-colors">
                          {evt.name}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-[10px] text-stone-400 px-1">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events list */}
      {events.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading font-semibold text-stone-800 mb-3">Upcoming</h3>
          <div className="space-y-2">
            {events
              .filter((e) => new Date(e.date) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 5)
              .map((evt) => (
                <Link
                  key={evt.id}
                  href={`/planner/${evt.id}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-3.5 shadow-soft hover:shadow-card transition-all group"
                >
                  <div className={`w-1.5 h-10 rounded-full shrink-0 ${statusDots[evt.status] ?? "bg-stone-300"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 group-hover:text-rose-500 transition-colors truncate">
                      {evt.name}
                    </p>
                    <p className="text-xs text-stone-400">
                      {new Date(evt.date).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                      {" · "}
                      {evt.venue}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    evt.status === "confirmed" ? "bg-emerald-50 text-emerald-600"
                      : evt.status === "planning" ? "bg-amber-50 text-amber-600"
                        : "bg-stone-100 text-stone-500"
                  }`}>
                    {evt.status}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
