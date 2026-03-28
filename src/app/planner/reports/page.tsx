"use client";

import { useEvents } from "@/hooks/useStore";
import { Event } from "@/lib/types";
import { BarChart3, TrendingUp, CalendarDays, PieChart } from "lucide-react";

function getInvoiceTotal(event: Event): number {
  return event.invoices.reduce(
    (sum, inv) => sum + inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0),
    0
  );
}

function getPaidTotal(event: Event): number {
  return event.invoices
    .filter((inv) => inv.status === "paid")
    .reduce(
      (sum, inv) => sum + inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0),
      0
    );
}

function getExpenseTotal(event: Event): number {
  return event.expenses.reduce((sum, e) => sum + e.amount, 0);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ReportsPage() {
  const events = useEvents();

  // ── Revenue by month (based on event date) ──
  const revenueByMonth: Record<string, { invoiced: number; paid: number; expenses: number }> = {};
  events.forEach((evt) => {
    const d = new Date(evt.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!revenueByMonth[key]) revenueByMonth[key] = { invoiced: 0, paid: 0, expenses: 0 };
    revenueByMonth[key].invoiced += getInvoiceTotal(evt);
    revenueByMonth[key].paid += getPaidTotal(evt);
    revenueByMonth[key].expenses += getExpenseTotal(evt);
  });
  const sortedMonths = Object.keys(revenueByMonth).sort();
  const maxRevenue = Math.max(...sortedMonths.map((m) => revenueByMonth[m].invoiced), 1);

  // ── Events by status ──
  const statusCounts: Record<string, number> = {};
  events.forEach((evt) => {
    statusCounts[evt.status] = (statusCounts[evt.status] || 0) + 1;
  });
  const statusColors: Record<string, string> = {
    planning: "bg-amber-400",
    confirmed: "bg-emerald-400",
    completed: "bg-stone-400",
  };
  const totalEvents = events.length || 1;

  // ── Busiest months (by event count) ──
  const eventsByMonth: Record<number, number> = {};
  events.forEach((evt) => {
    const month = new Date(evt.date).getMonth();
    eventsByMonth[month] = (eventsByMonth[month] || 0) + 1;
  });
  const maxEventsInMonth = Math.max(...Object.values(eventsByMonth), 1);

  // ── Summary stats ──
  const totalInvoiced = events.reduce((s, e) => s + getInvoiceTotal(e), 0);
  const totalPaid = events.reduce((s, e) => s + getPaidTotal(e), 0);
  const totalExpenses = events.reduce((s, e) => s + getExpenseTotal(e), 0);
  const avgPerEvent = events.length ? totalInvoiced / events.length : 0;

  const fmtFull = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl">
      <h1 className="text-2xl font-heading font-bold text-stone-800 mb-1">Reports</h1>
      <p className="text-sm text-stone-400 mb-8">Financial overview and event analytics.</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { label: "Total Invoiced", value: fmtFull(totalInvoiced), icon: BarChart3, color: "text-blue-600 bg-blue-50" },
          { label: "Collected", value: fmtFull(totalPaid), icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
          { label: "Expenses", value: fmtFull(totalExpenses), icon: PieChart, color: "text-rose-600 bg-rose-50" },
          { label: "Avg / Event", value: fmtFull(Math.round(avgPerEvent)), icon: CalendarDays, color: "text-violet-600 bg-violet-50" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={16} />
            </div>
            <p className="text-xs text-stone-400 mb-0.5">{card.label}</p>
            <p className="text-lg font-heading font-bold text-stone-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by month */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <h2 className="font-heading font-semibold text-stone-800 mb-4">Revenue by Month</h2>
          {sortedMonths.length === 0 ? (
            <p className="text-xs text-stone-300 text-center py-8">No invoice data yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedMonths.map((key) => {
                const [y, m] = key.split("-");
                const data = revenueByMonth[key];
                const pct = (data.invoiced / maxRevenue) * 100;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-stone-500 font-medium">
                        {MONTH_NAMES[parseInt(m) - 1]} {y}
                      </span>
                      <span className="text-stone-800 font-semibold">{fmtFull(data.invoiced)}</span>
                    </div>
                    <div className="h-6 bg-stone-50 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-blue-100 rounded-lg transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <div
                        className="h-full bg-emerald-300 rounded-lg absolute top-0 left-0 transition-all"
                        style={{ width: `${(data.paid / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-stone-400">
                      <span>Paid: {fmtFull(data.paid)}</span>
                      <span>Expenses: {fmtFull(data.expenses)}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-4 pt-2 text-[10px] text-stone-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-300" /> Paid</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-100" /> Invoiced</span>
              </div>
            </div>
          )}
        </div>

        {/* Events by status */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <h2 className="font-heading font-semibold text-stone-800 mb-4">Events by Status</h2>
          {events.length === 0 ? (
            <p className="text-xs text-stone-300 text-center py-8">No events yet.</p>
          ) : (
            <>
              {/* Stacked bar */}
              <div className="h-8 rounded-lg overflow-hidden flex mb-4">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div
                    key={status}
                    className={`${statusColors[status] ?? "bg-stone-300"} transition-all`}
                    style={{ width: `${(count / totalEvents) * 100}%` }}
                  />
                ))}
              </div>
              <div className="space-y-2.5">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded ${statusColors[status] ?? "bg-stone-300"}`} />
                      <span className="text-sm text-stone-600 capitalize">{status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-800">{count}</span>
                      <span className="text-xs text-stone-400">
                        ({Math.round((count / events.length) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Busiest months */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft lg:col-span-2">
          <h2 className="font-heading font-semibold text-stone-800 mb-4">Busiest Months</h2>
          {events.length === 0 ? (
            <p className="text-xs text-stone-300 text-center py-8">No events yet.</p>
          ) : (
            <div className="flex items-end gap-1.5 sm:gap-2 h-32">
              {MONTH_NAMES.map((name, i) => {
                const count = eventsByMonth[i] || 0;
                const pct = (count / maxEventsInMonth) * 100;
                return (
                  <div key={name} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-stone-500 font-medium">
                      {count > 0 ? count : ""}
                    </span>
                    <div className="w-full flex flex-col justify-end h-20">
                      <div
                        className={`w-full rounded-t-md transition-all ${
                          count > 0 ? "bg-rose-300" : "bg-stone-50"
                        }`}
                        style={{ height: count > 0 ? `${Math.max(pct, 12)}%` : "4px" }}
                      />
                    </div>
                    <span className="text-[10px] text-stone-400">{name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
