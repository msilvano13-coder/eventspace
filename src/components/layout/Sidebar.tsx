"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, BookUser, CalendarDays, Wallet } from "lucide-react";

const navItems = [
  { href: "/planner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/planner/questionnaires", label: "Questionnaires", icon: ClipboardList },
  { href: "/planner/finances", label: "Finances", icon: Wallet },
  { href: "/planner/directory", label: "Directory", icon: BookUser },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-stone-200 min-h-screen">
        <div className="p-5 border-b border-stone-100">
          <Link href="/planner" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rose-400 rounded-lg flex items-center justify-center font-heading font-bold text-white text-sm">
              E
            </div>
            <span className="text-lg font-heading font-semibold text-stone-800">
              EventSpace
            </span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? "bg-rose-50 text-rose-600 font-medium"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-stone-100 text-xs text-stone-400">
          EventSpace v0.1
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-t border-stone-200 md:hidden mobile-bottom-nav">
        <div className="flex justify-around items-center h-14">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 px-4 min-w-[64px] ${
                  active ? "text-rose-500" : "text-stone-400"
                }`}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
