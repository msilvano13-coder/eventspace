"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, ClipboardList, BookUser, CalendarDays, Wallet, Settings, Inbox, BarChart3, Search, Heart, FileText, MoreHorizontal, X, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePlannerProfile } from "@/hooks/useStore";
import { isProFeature } from "@/lib/plan-features";

const navItems = [
  { href: "/planner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/planner/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/planner/questionnaires", label: "Questionnaires", icon: ClipboardList },
  { href: "/planner/contracts", label: "Contracts", icon: FileText },
  { href: "/planner/finances", label: "Finances", icon: Wallet },
  { href: "/planner/reports", label: "Reports", icon: BarChart3 },
  { href: "/planner/directory", label: "Directory", icon: BookUser },
  { href: "/planner/discover", label: "Vendor Search", icon: Search },
  { href: "/planner/preferred", label: "Preferred Vendors", icon: Heart },
];

// First 4 items + "More" button for mobile bottom nav
const mobileMainItems = navItems.slice(0, 4);
const mobileMoreItems = [
  ...navItems.slice(4),
  { href: "/planner/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const router = useRouter();
  const profile = usePlannerProfile();
  const isDiy = profile.plan === "diy";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const moreActive = mobileMoreItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

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
            if (isDiy && isProFeature(item.href)) return null;
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
        <div className="p-3 border-t border-stone-100">
          <Link
            href="/planner/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              pathname === "/planner/settings"
                ? "bg-rose-50 text-rose-600 font-medium"
                : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
            }`}
          >
            <Settings size={18} />
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-stone-400 hover:text-red-600 hover:bg-red-50 w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-stone-200 md:hidden mobile-bottom-nav">
        <div className="flex items-center h-14">
          {mobileMainItems.filter((item) => !(isDiy && isProFeature(item.href))).map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-w-0 ${
                  active ? "text-rose-500" : "text-stone-400"
                }`}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-medium truncate max-w-full px-1">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-w-0 ${
              moreActive || showMore ? "text-rose-500" : "text-stone-400"
            }`}
          >
            {showMore ? <X size={20} /> : <MoreHorizontal size={20} />}
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        >
          <div className="absolute inset-0 bg-stone-900/20" />
          <div
            className="absolute bottom-14 left-0 right-0 bg-white rounded-t-2xl border-t border-stone-200 shadow-xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-1">
              {mobileMoreItems.filter((item) => !(isDiy && isProFeature(item.href))).map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                      active
                        ? "bg-rose-50 text-rose-500"
                        : "text-stone-500 hover:bg-stone-50"
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
