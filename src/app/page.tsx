"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarDays,
  FileSignature,
  ClipboardList,
  Palette,
  MapPin,
  MessageSquare,
  ChevronDown,
  Check,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Grid3X3,
  Receipt,
  Camera,
  Globe,
  Heart,
  Star,
  FileText,
  Send,
  UserCheck,
  LayoutDashboard,
  ArrowUpRight,
  Minus,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES_BENTO = [
  {
    icon: Globe,
    title: "Wedding Websites",
    description:
      "RSVP, registry, your story — one link for everything. Included with every plan.",
    badge: "New",
    size: "large" as const,
  },
  {
    icon: Grid3X3,
    title: "Floor Plans & 3D",
    description:
      "Drag tables onto a live canvas. Real dimensions. Switch to 3D in one click.",
    size: "large" as const,
  },
  {
    icon: Users,
    title: "Smart Seating",
    description:
      "Our algorithm seats guests respecting groups, VIPs, and keep-together rules.",
    size: "medium" as const,
  },
  {
    icon: FileSignature,
    title: "Contracts & E-Signatures",
    description: "Templates, dual signatures, real-time tracking.",
    size: "medium" as const,
  },
  {
    icon: Sparkles,
    title: "Branded Client Portal",
    description:
      "Your logo, your colors. Clients RSVP, sign contracts, and message you — no account needed.",
    size: "medium" as const,
  },
];

const FEATURES_LIST = [
  { icon: LayoutDashboard, label: "Dashboard & Calendar" },
  { icon: ClipboardList, label: "Vendor & Payment Tracking" },
  { icon: Receipt, label: "Invoicing & Finances" },
  { icon: CalendarDays, label: "Day-of Timeline & PDF Export" },
  { icon: Palette, label: "Mood Boards & Palettes" },
  { icon: MapPin, label: "Vendor Discovery" },
  { icon: Camera, label: "Shared Files" },
];

const PRO_STEPS = [
  { num: "01", label: "Capture inquiries", icon: Send },
  { num: "02", label: "Plan every detail", icon: Grid3X3 },
  { num: "03", label: "Collaborate with clients", icon: MessageSquare },
  { num: "04", label: "Execute day-of", icon: CalendarDays },
  { num: "05", label: "Close & get reviews", icon: Star },
];

const DIY_STEPS = [
  { num: "01", label: "Collect RSVPs", icon: UserCheck },
  { num: "02", label: "Design your layout", icon: Grid3X3 },
  { num: "03", label: "Seat your guests", icon: Users },
  { num: "04", label: "Build your timeline", icon: CalendarDays },
  { num: "05", label: "Print & go", icon: FileText },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the difference between DIY and Professional?",
    a: "DIY is a one-time $99 purchase for planning a single event — floor plans, smart seating, guest management, wedding website, timelines, and PDF export. Professional is $20/month with unlimited events plus business tools like inquiries pipeline, invoicing, e-signatures, questionnaires, and a branded client portal.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. EventSpace runs entirely in your browser — desktop, tablet, and mobile.",
  },
  {
    q: "How does the wedding website work?",
    a: "Every event gets a customizable wedding website with your event details, RSVP form, registry links, and your love story. Guests RSVP directly from the page.",
  },
  {
    q: "How does the client portal work?",
    a: "Each event gets a unique link you share with your client. They can view schedules, RSVP guests, sign contracts, fill out questionnaires, and message you — without needing an account.",
  },
  {
    q: "Can I design floor plans on my phone?",
    a: "Yes. The floor plan editor is fully optimized for touch with mobile-friendly controls and gesture support.",
  },
  {
    q: "Where is my data stored?",
    a: "Securely in the cloud using Supabase. Access your events from any device.",
  },
  {
    q: "Can multiple planners use one account?",
    a: "Currently designed for individual planners. Multi-user collaboration is on the roadmap.",
  },
];

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function FAQItem({ q, a, isLast }: { q: string; a: string; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={!isLast ? "border-b border-stone-200/60" : ""}>
      <button
        className="w-full flex items-center justify-between py-5 text-left group"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-[15px] font-medium text-stone-800 group-hover:text-stone-900 pr-8 transition-colors">
          {q}
        </span>
        <div
          className={`w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center shrink-0 transition-all ${
            open
              ? "bg-stone-900 border-stone-900 rotate-0"
              : "bg-transparent rotate-0"
          }`}
        >
          {open ? (
            <Minus size={12} className="text-white" />
          ) : (
            <ChevronDown size={12} className="text-stone-500" />
          )}
        </div>
      </button>
      <div
        className={`grid transition-all duration-200 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-[15px] text-stone-500 leading-relaxed max-w-2xl">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-xl border-b border-stone-200/40">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-md bg-stone-900 flex items-center justify-center text-white font-heading font-bold text-xs">
              E
            </span>
            <span className="font-heading text-lg font-semibold tracking-tight">
              EventSpace
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 text-[13px]">
            {["Features", "Pricing", "FAQ"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-all"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/sign-in"
              className="text-[13px] text-stone-500 hover:text-stone-900 px-3 py-1.5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-[13px] font-medium text-white bg-stone-900 hover:bg-stone-800 px-4 py-1.5 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>

          <button
            className="md:hidden p-1.5 -mr-1.5 text-stone-600 hover:text-stone-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200/60 bg-stone-50 px-5 pb-5">
            <div className="flex flex-col gap-1 pt-3">
              {["Features", "Pricing", "FAQ"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-stone-600 py-2 text-[15px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
              <hr className="border-stone-200/60 my-2" />
              <Link
                href="/sign-in"
                className="text-stone-600 py-2 text-[15px]"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="mt-1 text-center font-medium text-white bg-stone-900 px-5 py-2.5 rounded-lg text-[15px]"
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <header className="relative pt-24 sm:pt-32 pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-rose-400" />
            <span className="text-[13px] text-rose-500 font-medium tracking-wide uppercase">
              Event planning, reimagined
            </span>
          </div>

          {/* Headline — asymmetric, editorial */}
          <h1 className="font-heading text-[clamp(2.5rem,6vw,5.5rem)] font-bold leading-[0.95] tracking-tight text-stone-900 max-w-5xl">
            Every detail.
            <br />
            <span className="italic font-normal text-stone-400">
              Intentional.
            </span>
          </h1>

          <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row gap-12 sm:gap-20 max-w-4xl">
            <p className="text-lg sm:text-xl text-stone-500 leading-relaxed max-w-lg">
              Floor plans, guest lists, vendor contracts, timelines, and a
              wedding website — all in one place. Built for professional
              planners and couples doing it themselves.
            </p>

            <div className="flex flex-col gap-3 sm:pt-1">
              <div>
                <Link
                  href="/sign-up"
                  className="group inline-flex items-center gap-3 text-[15px] font-medium text-stone-900 hover:text-rose-600 transition-colors"
                >
                  <span className="w-10 h-10 rounded-full bg-rose-500 group-hover:bg-rose-600 flex items-center justify-center transition-colors">
                    <ArrowRight size={16} className="text-white" />
                  </span>
                  Start free trial
                </Link>
                <p className="text-xs text-stone-400 ml-[52px] mt-1">
                  No credit card required
                </p>
              </div>
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-3 text-[15px] font-medium text-stone-500 hover:text-stone-700 transition-colors"
              >
                <span className="w-10 h-10 rounded-full border border-stone-300 group-hover:border-stone-400 flex items-center justify-center transition-colors">
                  <Heart size={14} className="text-stone-400 group-hover:text-stone-500" />
                </span>
                Planning my own wedding
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Social proof strip ─────────────────────────────────── */}
      <div className="border-y border-stone-200/60 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-6">
          <p className="text-[13px] text-stone-400 uppercase tracking-wider font-medium">
            Works for
          </p>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3 text-sm text-stone-500">
            {[
              "Wedding Planners",
              "Corporate Events",
              "Galas & Fundraisers",
              "Private Parties",
              "Conferences",
            ].map((item) => (
              <span key={item} className="whitespace-nowrap">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features — Bento ──────────────────────────────────── */}
      <section id="features" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
              Everything in one place.
              <br />
              <span className="text-stone-400 font-normal">
                No more juggling tools.
              </span>
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large cards — span 2 cols on lg */}
            {FEATURES_BENTO.filter((f) => f.size === "large").map((f) => (
              <div
                key={f.title}
                className="lg:col-span-1 bg-white rounded-2xl p-7 sm:p-8 border border-stone-200/60 hover:border-stone-300 transition-colors relative group"
              >
                {"badge" in f && f.badge && (
                  <span className="absolute top-6 right-6 text-[11px] font-semibold text-rose-500 bg-rose-50 rounded-full px-2.5 py-0.5">
                    {f.badge}
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center mb-5 group-hover:bg-rose-50 transition-colors">
                  <f.icon
                    size={20}
                    className="text-stone-500 group-hover:text-rose-500 transition-colors"
                  />
                </div>
                <h3 className="font-heading text-xl font-semibold text-stone-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-[15px] text-stone-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}

            {/* Medium cards */}
            {FEATURES_BENTO.filter((f) => f.size === "medium").map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-7 border border-stone-200/60 hover:border-stone-300 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center mb-5 group-hover:bg-rose-50 transition-colors">
                  <f.icon
                    size={20}
                    className="text-stone-500 group-hover:text-rose-500 transition-colors"
                  />
                </div>
                <h3 className="font-heading text-lg font-semibold text-stone-900 mb-1.5">
                  {f.title}
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}

            {/* "And more" compact card */}
            <div className="bg-stone-100/60 rounded-2xl p-7 border border-stone-200/40">
              <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-4">
                Plus
              </p>
              <div className="space-y-3">
                {FEATURES_LIST.map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <f.icon size={15} className="text-stone-400 shrink-0" />
                    <span className="text-sm text-stone-600">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works — Pro vs DIY side by side ────────────── */}
      <section className="py-24 sm:py-32 bg-white border-y border-stone-200/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
              Two paths.
              <br />
              <span className="text-stone-400 font-normal">
                Same great tools.
              </span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pro path */}
            <div className="rounded-2xl border border-stone-200/60 bg-stone-50/50 p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[11px] font-semibold text-stone-500 bg-stone-200/60 rounded-full px-3 py-1 uppercase tracking-wider">
                  Professional
                </span>
                <span className="text-[13px] text-stone-400">
                  $20/mo &middot; 30-day free trial
                </span>
              </div>

              <p className="font-heading text-2xl font-semibold text-stone-900 mb-2">
                From inquiry to five-star review
              </p>
              <p className="text-[15px] text-stone-500 mb-8 leading-relaxed">
                Replace your patchwork of spreadsheets, PDFs, and email chains
                with one platform.
              </p>

              <div className="space-y-0">
                {PRO_STEPS.map((s, i) => (
                  <div key={s.num} className="flex items-center gap-4 group">
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-mono text-stone-400 w-6 text-center">
                        {s.num}
                      </span>
                      {i < PRO_STEPS.length - 1 && (
                        <div className="w-px h-6 bg-stone-200 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 py-2">
                      <s.icon
                        size={15}
                        className="text-stone-400 group-hover:text-rose-500 transition-colors shrink-0"
                      />
                      <span className="text-[15px] text-stone-700 group-hover:text-stone-900 transition-colors">
                        {s.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/sign-up"
                className="mt-8 inline-flex items-center gap-2 text-[13px] font-medium text-stone-900 hover:text-rose-600 transition-colors"
              >
                Start free trial
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {/* DIY path */}
            <div className="rounded-2xl border border-rose-200/60 bg-rose-50/30 p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[11px] font-semibold text-rose-500 bg-rose-100/60 rounded-full px-3 py-1 uppercase tracking-wider">
                  DIY
                </span>
                <span className="text-[13px] text-stone-400">
                  $99 one-time{" "}
                  <span className="line-through text-stone-300">$199</span>
                </span>
              </div>

              <p className="font-heading text-2xl font-semibold text-stone-900 mb-2">
                From RSVP to day-of PDF
              </p>
              <p className="text-[15px] text-stone-500 mb-8 leading-relaxed">
                Professional-grade planning tools for your wedding, without the
                professional price tag.
              </p>

              <div className="space-y-0">
                {DIY_STEPS.map((s, i) => (
                  <div key={s.num} className="flex items-center gap-4 group">
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-mono text-stone-400 w-6 text-center">
                        {s.num}
                      </span>
                      {i < DIY_STEPS.length - 1 && (
                        <div className="w-px h-6 bg-rose-200/60 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 py-2">
                      <s.icon
                        size={15}
                        className="text-stone-400 group-hover:text-rose-500 transition-colors shrink-0"
                      />
                      <span className="text-[15px] text-stone-700 group-hover:text-stone-900 transition-colors">
                        {s.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/sign-up"
                className="mt-8 inline-flex items-center gap-2 text-[13px] font-medium text-stone-900 hover:text-rose-600 transition-colors"
              >
                Start planning
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900">
              Pricing
            </h2>
            <p className="mt-3 text-lg text-stone-500">
              One event or a whole business — pick what fits.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
            {/* DIY */}
            <div className="rounded-2xl border border-stone-200/60 bg-white p-8">
              <p className="text-[13px] text-emerald-600 font-medium mb-4">
                50% off — limited time
              </p>
              <h3 className="font-heading text-xl font-semibold text-stone-900">
                DIY
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                Plan your own event, your way
              </p>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-bold text-stone-900">
                  $99
                </span>
                <span className="text-sm text-stone-400">one-time</span>
              </p>
              <p className="text-sm text-stone-400 mt-1">
                <span className="line-through">$199</span>
                <span className="ml-2 text-emerald-600 font-medium">
                  Save $100
                </span>
              </p>

              <Link
                href="/sign-up"
                className="mt-6 block text-center text-[13px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 px-6 py-2.5 rounded-lg transition-colors"
              >
                Start planning
              </Link>

              <div className="mt-8 pt-6 border-t border-stone-100">
                <ul className="space-y-3 text-sm text-stone-600">
                  {[
                    "1 active event",
                    "Wedding website",
                    "Floor plan editor with 3D view",
                    "6 venue presets",
                    "Smart seating algorithm",
                    "Guest management & RSVPs",
                    "Day-of timeline",
                    "Vendor tracking & search",
                    "Contracts & budget",
                    "Color palette & mood board",
                    "Shared files",
                    "Layout templates",
                    "PDF export",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        className="shrink-0 text-stone-400 mt-0.5"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Professional */}
            <div className="rounded-2xl border-2 border-stone-900 bg-white p-8 relative">
              <span className="absolute -top-3 left-6 bg-stone-900 text-white text-[11px] font-medium px-3 py-1 rounded-full">
                Most popular
              </span>
              <p className="text-[13px] text-rose-500 font-medium mb-4">
                30-day free trial
              </p>
              <h3 className="font-heading text-xl font-semibold text-stone-900">
                Professional
              </h3>
              <p className="text-sm text-stone-500 mt-1">
                Everything to run a planning business
              </p>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-bold text-stone-900">
                  $20
                </span>
                <span className="text-sm text-stone-400">/ month</span>
              </p>
              <p className="text-sm text-stone-400 mt-1">
                No credit card required
              </p>

              <Link
                href="/sign-up"
                className="mt-6 block text-center text-[13px] font-medium text-white bg-stone-900 hover:bg-stone-800 px-6 py-2.5 rounded-lg transition-colors"
              >
                Start free trial
              </Link>

              <div className="mt-8 pt-6 border-t border-stone-100">
                <ul className="space-y-3 text-sm text-stone-600">
                  {[
                    "Unlimited events",
                    "Everything in DIY",
                    "Inquiries & leads pipeline",
                    "Client questionnaires",
                    "Invoicing & payment tracking",
                    "Financial reports & dashboard",
                    "Calendar view (all events)",
                    "Preferred vendors list",
                    "Contract templates & e-signatures",
                    "Branded client portal",
                    "CSV import & export",
                    "Priority support",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        className="shrink-0 text-stone-900 mt-0.5"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section
        id="faq"
        className="py-24 sm:py-32 bg-white border-t border-stone-200/60"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-16">
            <div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 sticky top-24">
                FAQ
              </h2>
            </div>
            <div>
              {FAQS.map((faq, i) => (
                <FAQItem
                  key={faq.q}
                  q={faq.q}
                  a={faq.a}
                  isLast={i === FAQS.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA — minimal, not a banner ────────────────── */}
      <section className="py-24 sm:py-32 border-t border-stone-200/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-stone-900 leading-tight">
            Your next event
            <br />
            <span className="italic font-normal text-stone-400">
              starts here.
            </span>
          </h2>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2.5 text-[15px] font-medium text-white bg-stone-900 hover:bg-stone-800 px-7 py-3 rounded-xl transition-colors"
            >
              Get started free
              <ArrowRight size={16} />
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-400">
            Free 30-day trial &middot; No credit card &middot; Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-stone-900 text-stone-400">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-white font-heading font-bold text-xs">
                  E
                </span>
                <span className="font-heading text-lg font-semibold text-white">
                  EventSpace
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Event planning software for professionals and DIY couples.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-4">
                Product
              </p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-white transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-4">
                Use cases
              </p>
              <ul className="space-y-2.5 text-sm">
                <li>Wedding Planning</li>
                <li>Corporate Events</li>
                <li>Galas & Fundraisers</li>
                <li>Private Parties</li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-4">
                Resources
              </p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/sign-in"
                    className="hover:text-white transition-colors"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sign-up"
                    className="hover:text-white transition-colors"
                  >
                    Get started
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="hover:text-white transition-colors"
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px]">
            <p>&copy; {new Date().getFullYear()} EventSpace</p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/blog"
                className="hover:text-white transition-colors"
              >
                Blog
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
