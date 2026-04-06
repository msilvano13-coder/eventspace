"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, LifeBuoy, ArrowLeft } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Metrics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col w-60 bg-white border-r border-stone-200 min-h-screen">
      <div className="p-5 border-b border-stone-100">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-rose-400 rounded-lg flex items-center justify-center font-heading font-bold text-white text-sm">
            E
          </div>
          <span className="text-lg font-heading font-semibold text-stone-800">
            SoiréeSpace
          </span>
          <span className="text-[10px] font-medium bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

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
          href="/planner"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Planner
        </Link>
      </div>
    </aside>
  );
}
