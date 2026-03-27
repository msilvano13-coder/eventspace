"use client";

import { useEvents } from "@/hooks/useStore";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { Event } from "@/lib/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

interface EventFinancials {
  event: Event;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalExpenses: number;
  profit: number;
}

export default function FinancesPage() {
  const events = useEvents();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "profitable" | "loss">("all");

  const financials = useMemo<EventFinancials[]>(() => {
    return events.map((event) => {
      const invoices = event.invoices ?? [];
      const expenses = event.expenses ?? [];
      const totalInvoiced = invoices.reduce(
        (sum, inv) => sum + inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0),
        0
      );
      const totalPaid = invoices
        .filter((inv) => inv.status === "paid")
        .reduce(
          (sum, inv) => sum + inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0),
          0
        );
      const totalOutstanding = totalInvoiced - totalPaid;
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const profit = totalInvoiced - totalExpenses;
      return { event, totalInvoiced, totalPaid, totalOutstanding, totalExpenses, profit };
    });
  }, [events]);

  const filtered = useMemo(() => {
    let list = financials;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.event.name.toLowerCase().includes(q) ||
          f.event.clientName.toLowerCase().includes(q)
      );
    }
    if (filter === "profitable") list = list.filter((f) => f.profit > 0);
    if (filter === "loss") list = list.filter((f) => f.profit < 0);
    return list;
  }, [financials, search, filter]);

  // Totals across all events
  const totals = useMemo(() => {
    return financials.reduce(
      (acc, f) => ({
        invoiced: acc.invoiced + f.totalInvoiced,
        paid: acc.paid + f.totalPaid,
        outstanding: acc.outstanding + f.totalOutstanding,
        expenses: acc.expenses + f.totalExpenses,
        profit: acc.profit + f.profit,
      }),
      { invoiced: 0, paid: 0, outstanding: 0, expenses: 0, profit: 0 }
    );
  }, [financials]);

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-stone-800">Finances</h1>
        <p className="text-sm text-stone-400 mt-1">
          Overview of all event income and expenses
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={14} className="text-blue-400" />
            <span className="text-xs font-medium text-stone-400">Total Invoiced</span>
          </div>
          <p className="text-lg font-heading font-bold text-stone-800">{fmt(totals.invoiced)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-stone-400">Received</span>
          </div>
          <p className="text-lg font-heading font-bold text-emerald-600">{fmt(totals.paid)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-stone-400">Outstanding</span>
          </div>
          <p className="text-lg font-heading font-bold text-amber-600">{fmt(totals.outstanding)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-red-400" />
            <span className="text-xs font-medium text-stone-400">Total Expenses</span>
          </div>
          <p className="text-lg font-heading font-bold text-red-500">{fmt(totals.expenses)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-soft col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={14} className={totals.profit >= 0 ? "text-emerald-400" : "text-red-400"} />
            <span className="text-xs font-medium text-stone-400">Net Profit</span>
          </div>
          <p className={`text-lg font-heading font-bold ${totals.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {fmt(totals.profit)}
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "profitable", "loss"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-rose-50 text-rose-600"
                  : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              }`}
            >
              {f === "all" ? "All" : f === "profitable" ? "Profitable" : "At Loss"}
            </button>
          ))}
        </div>
      </div>

      {/* Event Breakdown */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-soft">
            <p className="text-sm text-stone-400">No events match your filters.</p>
          </div>
        ) : (
          filtered.map((f) => (
            <EventFinanceCard key={f.event.id} data={f} />
          ))
        )}
      </div>
    </div>
  );
}

function EventFinanceCard({ data }: { data: EventFinancials }) {
  const { event, totalInvoiced, totalPaid, totalOutstanding, totalExpenses, profit } = data;
  const [expanded, setExpanded] = useState(false);
  const expenses = event.expenses ?? [];
  const invoices = event.invoices ?? [];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-soft overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-stone-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-semibold text-stone-800">{event.name}</h3>
            <span className="text-xs text-stone-400">{event.clientName}</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs">
            <span className="text-stone-500">Invoiced: <span className="font-semibold text-stone-700">{fmt(totalInvoiced)}</span></span>
            <span className="text-stone-500">Expenses: <span className="font-semibold text-red-500">{fmt(totalExpenses)}</span></span>
            <span className="text-stone-500">
              Net:{" "}
              <span className={`font-semibold ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {fmt(profit)}
              </span>
            </span>
          </div>
        </div>
        <ChevronRight
          size={16}
          className={`text-stone-300 transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-stone-100 px-5 pb-5">
          {/* Income section */}
          <div className="mt-4 mb-5">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Income (Invoices)</h4>
            {invoices.length === 0 ? (
              <p className="text-xs text-stone-400">No invoices.</p>
            ) : (
              <div className="space-y-1.5">
                {invoices.map((inv) => {
                  const total = inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
                  return (
                    <div key={inv.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-stone-50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-stone-700">{inv.number}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-600"
                            : inv.status === "sent"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-stone-100 text-stone-500"
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-stone-700">{fmt(total)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between pt-2 border-t border-stone-100 px-2">
                  <span className="text-xs font-medium text-stone-500">Received</span>
                  <span className="text-xs font-semibold text-emerald-600">{fmt(totalPaid)}</span>
                </div>
                <div className="flex justify-between px-2">
                  <span className="text-xs font-medium text-stone-500">Outstanding</span>
                  <span className="text-xs font-semibold text-amber-600">{fmt(totalOutstanding)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Expenses section */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Expenses</h4>
            {expenses.length === 0 ? (
              <p className="text-xs text-stone-400">No expenses tracked.</p>
            ) : (
              <div className="space-y-1.5">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-stone-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-700">{exp.description}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium">{exp.category}</span>
                    </div>
                    <span className="text-sm font-medium text-red-500">{fmt(exp.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-stone-100 px-2">
                  <span className="text-xs font-medium text-stone-500">Total Expenses</span>
                  <span className="text-xs font-semibold text-red-500">{fmt(totalExpenses)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Net summary */}
          <div className="bg-stone-50 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm font-medium text-stone-600">Net Profit / Loss</span>
            <span className={`text-base font-heading font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {fmt(profit)}
            </span>
          </div>

          <div className="mt-3 flex justify-end">
            <Link
              href={`/planner/${event.id}`}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium"
            >
              View Event →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
