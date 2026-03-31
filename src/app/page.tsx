"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
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
  BarChart3,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const PRO_JOURNEY = [
  {
    step: "01",
    title: "Capture the Inquiry",
    description:
      "Leads flow into your inquiries pipeline. Qualify, follow up, and convert — all from one dashboard.",
    icon: Send,
  },
  {
    step: "02",
    title: "Plan Every Detail",
    description:
      "Floor plans, vendors, guest lists, timelines, mood boards, and contracts. Build a complete event in hours, not weeks.",
    icon: Grid3X3,
  },
  {
    step: "03",
    title: "Collaborate with Clients",
    description:
      "Share a branded portal where clients RSVP guests, sign contracts, fill questionnaires, view their wedding website, and message you directly.",
    icon: MessageSquare,
  },
  {
    step: "04",
    title: "Execute Day-Of",
    description:
      "Print your timeline PDF, pull up the seating chart on your phone, and run the event with confidence.",
    icon: CalendarDays,
  },
  {
    step: "05",
    title: "Close & Get Reviews",
    description:
      "Send final invoices, collect payment, and request reviews — building your reputation for the next booking.",
    icon: Star,
  },
];

const DIY_JOURNEY = [
  {
    step: "01",
    title: "Collect RSVPs",
    description:
      "Share your wedding website and guest portal link. Guests RSVP, choose meals, and note dietary needs — no spreadsheets required.",
    icon: UserCheck,
  },
  {
    step: "02",
    title: "Design Your Layout",
    description:
      "Drag tables, chairs, and lighting onto the interactive floor plan. See real dimensions and seat counts. Switch to 3D to visualize the room.",
    icon: Grid3X3,
  },
  {
    step: "03",
    title: "Seat Your Guests",
    description:
      "Smart seating assigns guests to tables respecting groups, VIPs, and keep-together rules. Or drag and drop manually.",
    icon: Users,
  },
  {
    step: "04",
    title: "Build Your Timeline",
    description:
      "Create a minute-by-minute day-of schedule. Drag to reorder. Share it with your wedding party and vendors.",
    icon: CalendarDays,
  },
  {
    step: "05",
    title: "Print & Go",
    description:
      "Export your floor plan, seating chart, and timeline as PDFs. Everything you need for your day-of binder in one click.",
    icon: FileText,
  },
];

const FEATURES = [
  {
    icon: Globe,
    title: "Wedding Website",
    description:
      "Give your guests a beautiful, personalized wedding website with event details, RSVP, registry links, and your love story — included with every plan.",
    badge: "New",
  },
  {
    icon: Grid3X3,
    title: "Interactive Floor Plans",
    description:
      "Drag-and-drop tables, furniture groups, and lighting zones onto a live canvas. Real dimensions in feet and inches. Switch to 3D for client proposals.",
  },
  {
    icon: Users,
    title: "Guest Management & Smart Seating",
    description:
      "Track RSVPs, meal choices, and dietary needs. Auto-assign seats with a smart algorithm that respects VIP priority and group cohesion.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard & Calendar",
    description:
      "See every event at a glance. Filter by status, search by name or venue, and switch between grid and calendar views.",
  },
  {
    icon: ClipboardList,
    title: "Vendor & Payment Tracking",
    description:
      "Manage vendors by category, track contract totals, and log payments with due dates and paid status.",
  },
  {
    icon: FileSignature,
    title: "Contracts & E-Signatures",
    description:
      "Create contracts from templates, collect dual e-signatures, and track signing status in real time.",
  },
  {
    icon: Receipt,
    title: "Invoicing & Finances",
    description:
      "Generate line-item invoices, track expenses, and view financial reports and dashboards across all your events.",
  },
  {
    icon: CalendarDays,
    title: "Day-of Timeline & PDF Export",
    description:
      "Build a minute-by-minute schedule. Drag to reorder. Export to PDF for day-of binders your team and vendors can follow.",
  },
  {
    icon: Palette,
    title: "Mood Boards & Color Palettes",
    description:
      "Upload inspiration images and define color palettes your clients can view in their portal.",
  },
  {
    icon: MapPin,
    title: "Vendor Discovery",
    description:
      "Search for local vendors powered by Google Places. Save favorites to your preferred vendor list.",
  },
  {
    icon: Camera,
    title: "Shared Files",
    description:
      "Upload contracts, photos, and mood boards to a shared space both you and your client can access.",
  },
  {
    icon: Sparkles,
    title: "Branded Client Portal",
    description:
      "Give every client their own portal with your logo, brand colors, and tagline — schedules, RSVPs, contracts, files, and messaging in one place.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the difference between DIY and Professional?",
    a: "The DIY plan is a one-time purchase (currently $99, 50% off the regular $199) — perfect for planning a single event like your wedding or a big party. It includes floor plans with 3D visualization, smart seating, guest management, timelines, a wedding website, mood boards, layout templates, and PDF export. Professional is $20/month and unlocks unlimited events plus business tools like inquiries pipeline, invoicing, e-signatures, questionnaires, and a branded client portal.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. EventSpace runs entirely in your browser. Just open the app and start planning. It works on desktop, tablet, and mobile.",
  },
  {
    q: "How does the wedding website work?",
    a: "Every event gets a customizable wedding website you can share with guests. It includes your event details, RSVP form, registry links, and your love story. Guests can RSVP and manage their details directly from the site.",
  },
  {
    q: "How does the client portal work?",
    a: "Each event gets a unique link you share with your client. They can view schedules, RSVP guests, sign contracts, fill out questionnaires, and message you — without needing an account.",
  },
  {
    q: "Can I design floor plans on my phone?",
    a: "Yes. The floor plan editor is fully optimized for touch devices with mobile-friendly controls, collapsible panels, and gesture support.",
  },
  {
    q: "Where is my data stored?",
    a: "Your data is securely stored in the cloud using Supabase. You can access your events from any device by signing in to your account.",
  },
  {
    q: "Can multiple planners use EventSpace on the same account?",
    a: "Currently, EventSpace is designed for individual planners. Each browser session has its own data. Multi-user collaboration is on the roadmap.",
  },
];


/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-200">
      <button
        className="w-full flex items-center justify-between py-5 text-left font-medium text-stone-800 hover:text-rose-600 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="pr-4">{q}</span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-stone-600 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function JourneyStep({
  step,
  title,
  description,
  icon: Icon,
  isLast,
}: {
  step: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {step}
        </div>
        {!isLast && <div className="w-px flex-1 bg-rose-200 my-2" />}
      </div>
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className="text-rose-500" />
          <h4 className="font-heading font-semibold text-stone-900">{title}</h4>
        </div>
        <p className="text-sm text-stone-500 leading-relaxed">{description}</p>
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
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white font-heading font-bold text-sm">
              E
            </span>
            <span className="font-heading text-xl font-semibold tracking-tight">
              EventSpace
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#for-planners" className="text-stone-600 hover:text-stone-900 transition-colors">
              For Planners
            </a>
            <a href="#for-diy" className="text-stone-600 hover:text-stone-900 transition-colors">
              For DIY
            </a>
            <a href="#features" className="text-stone-600 hover:text-stone-900 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-stone-600 hover:text-stone-900 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-stone-600 hover:text-stone-900 transition-colors">
              FAQ
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 px-4 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 px-5 py-2 rounded-lg transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-stone-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-stone-50 px-4 pb-4">
            <div className="flex flex-col gap-3 pt-3">
              <a href="#for-planners" className="text-stone-600 py-2" onClick={() => setMobileMenuOpen(false)}>For Planners</a>
              <a href="#for-diy" className="text-stone-600 py-2" onClick={() => setMobileMenuOpen(false)}>For DIY</a>
              <a href="#features" className="text-stone-600 py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="text-stone-600 py-2" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#faq" className="text-stone-600 py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <hr className="border-stone-200" />
              <Link href="/sign-in" className="text-stone-600 py-2">Sign In</Link>
              <Link
                href="/sign-up"
                className="text-center font-medium text-white bg-rose-500 hover:bg-rose-600 px-5 py-2.5 rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/80 via-stone-50 to-amber-50/40" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-4 py-1.5 mb-6">
            <Sparkles size={14} />
            <span>Now with wedding websites, interactive floor plans & smart seating</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 max-w-4xl mx-auto leading-[1.1]">
            From First Inquiry to{" "}
            <span className="text-rose-500">Five-Star Review.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Whether you&apos;re a professional planner managing a full client roster
            or planning your own wedding — EventSpace takes you from start to finish.
          </p>

          {/* Two-path CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-medium text-white bg-rose-500 hover:bg-rose-600 px-8 py-3.5 rounded-xl transition-colors shadow-md shadow-rose-200"
            >
              <BarChart3 size={18} />
              I&apos;m a Wedding Planner
            </Link>
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-medium text-stone-700 bg-white hover:bg-stone-100 px-8 py-3.5 rounded-xl transition-colors border border-stone-200"
            >
              <Heart size={18} />
              I&apos;m Planning My Own Wedding
            </Link>
          </div>

          <p className="mt-6 text-sm text-stone-400">
            30-day free trial on Professional &middot; No credit card required
          </p>
        </div>
      </header>

      {/* ── Wedding Website Spotlight ─────────────────────────── */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-rose-500 to-pink-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-100 bg-white/20 rounded-full px-3 py-1 mb-4">
                <Globe size={12} />
                New Feature
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white leading-tight">
                Beautiful Wedding Websites, Built In
              </h2>
              <p className="mt-4 text-lg text-rose-100 leading-relaxed">
                Share your love story, event details, and registry links with a personalized
                wedding website. Guests RSVP directly from the page — no third-party tools needed.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-rose-50">
                {[
                  "Personalized event details & love story",
                  "Built-in RSVP with meal & dietary tracking",
                  "Registry links & accommodation info",
                  "Matches your event branding",
                  "Included with every plan — DIY and Pro",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check size={14} className="shrink-0 text-white" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-rose-600 bg-white hover:bg-rose-50 px-6 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                Create Your Wedding Website
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="flex-1 max-w-sm">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <Globe size={32} className="text-white" />
                </div>
                <p className="text-white font-heading font-semibold text-lg">Sarah & James</p>
                <p className="text-rose-200 text-sm mt-1">June 15, 2026 &middot; Napa Valley</p>
                <div className="mt-4 space-y-2 text-xs text-rose-100">
                  <div className="bg-white/10 rounded-lg py-2 px-3">Our Story</div>
                  <div className="bg-white/10 rounded-lg py-2 px-3">Event Details</div>
                  <div className="bg-white/10 rounded-lg py-2 px-3">RSVP</div>
                  <div className="bg-white/10 rounded-lg py-2 px-3">Registry</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Journey: Wedding Planners (Pro) ───────────────────── */}
      <section id="for-planners" className="py-20 sm:py-28 bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            {/* Left: pitch */}
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-3 py-1 mb-4">
                Professional Plan
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
                From Inquiry to Five-Star Review
              </h2>
              <p className="mt-4 text-lg text-stone-500 leading-relaxed">
                EventSpace replaces your patchwork of spreadsheets, PDFs, and email chains
                with one platform that handles every stage of your planning business.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                {[
                  { label: "Inquiries Pipeline", icon: Send },
                  { label: "Branded Portal", icon: Sparkles },
                  { label: "E-Signatures", icon: FileSignature },
                  { label: "Invoicing", icon: Receipt },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-stone-50 rounded-xl p-4 border border-stone-100"
                  >
                    <item.icon size={20} className="text-rose-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-stone-700">{item.label}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/sign-up"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 px-6 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                Start 30-Day Free Trial
                <ArrowRight size={16} />
              </Link>
              <p className="mt-2 text-xs text-stone-400">$20/mo after trial &middot; Cancel anytime</p>
            </div>

            {/* Right: journey steps */}
            <div>
              {PRO_JOURNEY.map((s, i) => (
                <JourneyStep
                  key={s.step}
                  {...s}
                  isLast={i === PRO_JOURNEY.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Journey: DIY ─────────────────────────────────────── */}
      <section id="for-diy" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            {/* Left: journey steps (reversed layout for visual variety) */}
            <div className="order-2 lg:order-1">
              {DIY_JOURNEY.map((s, i) => (
                <JourneyStep
                  key={s.step}
                  {...s}
                  isLast={i === DIY_JOURNEY.length - 1}
                />
              ))}
            </div>

            {/* Right: pitch */}
            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-4">
                DIY Plan
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
                From RSVP to Day-of PDF
              </h2>
              <p className="mt-4 text-lg text-stone-500 leading-relaxed">
                Planning your own wedding? Skip the expensive planner software. EventSpace
                gives you professional-grade tools for a single, one-time price.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                {[
                  { label: "Wedding Website", icon: Globe },
                  { label: "Floor Plans & 3D", icon: Grid3X3 },
                  { label: "Smart Seating", icon: Users },
                  { label: "PDF Export", icon: FileText },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white rounded-xl p-4 border border-stone-100 shadow-sm"
                  >
                    <item.icon size={20} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-stone-700">{item.label}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/sign-up"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                Start Planning — $99 One-Time
                <ArrowRight size={16} />
              </Link>
              <p className="mt-2 text-xs text-stone-400">
                <span className="line-through">$199</span>
                <span className="ml-1 text-emerald-600 font-medium">50% off — limited time</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── All Features ─────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 bg-white border-y border-stone-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900">
              Everything You Need in One Place
            </h2>
            <p className="mt-4 text-lg text-stone-500 max-w-2xl mx-auto">
              Wedding websites, floor plans, vendors, guests, contracts, timelines,
              and client communication — no more juggling tools.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-stone-50 rounded-2xl p-6 border border-stone-100 hover:shadow-card transition-shadow relative"
              >
                {"badge" in f && f.badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5">
                    {f.badge}
                  </span>
                )}
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-rose-500" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-stone-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-stone-500 leading-relaxed text-sm">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-stone-500 max-w-2xl mx-auto">
              One event or a whole business — pick the plan that fits.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* DIY */}
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                50% Off — Limited Time
              </span>
              <h3 className="font-heading text-xl font-semibold text-stone-900">DIY</h3>
              <p className="mt-1 text-sm text-stone-500">Plan your own event, your way</p>
              <p className="mt-6">
                <span className="font-heading text-4xl font-bold text-stone-900">$99</span>
                <span className="text-stone-400 text-sm"> one-time</span>
              </p>
              <p className="mt-1 text-sm text-stone-400">
                <span className="line-through">$199</span>
                <span className="ml-1.5 text-emerald-600 font-medium">Save $100</span>
              </p>
              <Link
                href="/sign-up"
                className="mt-6 block text-center font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                Start Planning
              </Link>
              <p className="mt-5 mb-4 text-xs text-stone-400 font-medium uppercase tracking-wider">From RSVP to day-of PDF</p>
              <ul className="space-y-3 text-sm text-stone-600">
                {[
                  "1 active event",
                  "Wedding website",
                  "Floor plan editor with 3D view",
                  "6 venue presets (tent, garden, barn & more)",
                  "Smart seating algorithm",
                  "Guest management & RSVPs",
                  "Day-of timeline",
                  "Vendor tracking & search",
                  "Contracts & budget",
                  "Color palette & mood board",
                  "Shared files",
                  "Layout templates",
                  "PDF floor plan & timeline export",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Professional */}
            <div className="bg-white rounded-2xl p-8 border-2 border-rose-500 shadow-lg relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                For Professionals
              </span>
              <h3 className="font-heading text-xl font-semibold text-stone-900">Professional</h3>
              <p className="mt-1 text-sm text-stone-500">Everything you need to run a planning business</p>
              <p className="mt-6">
                <span className="font-heading text-4xl font-bold text-stone-900">$20</span>
                <span className="text-stone-400 text-sm"> / month</span>
              </p>
              <Link
                href="/sign-up"
                className="mt-6 block text-center font-medium text-white bg-rose-500 hover:bg-rose-600 px-6 py-2.5 rounded-lg transition-colors text-sm shadow-sm"
              >
                Start 30-Day Free Trial
              </Link>
              <p className="text-xs text-stone-400 mt-2 text-center">No credit card required</p>
              <p className="mt-5 mb-4 text-xs text-stone-400 font-medium uppercase tracking-wider">From inquiry to five-star review</p>
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
                  <li key={item} className="flex items-start gap-2">
                    <Check size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 sm:py-28 bg-white border-t border-stone-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900">
              Frequently Asked Questions
            </h2>
          </div>
          <div>
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-rose-500 to-rose-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white">
            Ready to Plan Smarter?
          </h2>
          <p className="mt-4 text-lg text-rose-100 max-w-xl mx-auto">
            Join thousands of planners and couples using EventSpace to create unforgettable events.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-medium text-rose-600 bg-white hover:bg-rose-50 px-8 py-3.5 rounded-xl transition-colors shadow-md"
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-stone-900 text-stone-400 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white font-heading font-bold text-sm">
                  E
                </span>
                <span className="font-heading text-xl font-semibold text-white">
                  EventSpace
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                Event planning software for professionals and DIY planners.
                From inquiry to review. From RSVP to day-of PDF.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-heading text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Product
              </h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#for-planners" className="hover:text-white transition-colors">For Planners</a></li>
                <li><a href="#for-diy" className="hover:text-white transition-colors">For DIY</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Use Cases */}
            <div>
              <h4 className="font-heading text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Use Cases
              </h4>
              <ul className="space-y-2 text-sm">
                <li><span className="hover:text-white transition-colors cursor-default">Wedding Planning</span></li>
                <li><span className="hover:text-white transition-colors cursor-default">Corporate Events</span></li>
                <li><span className="hover:text-white transition-colors cursor-default">Galas & Fundraisers</span></li>
                <li><span className="hover:text-white transition-colors cursor-default">Private Parties</span></li>
                <li><span className="hover:text-white transition-colors cursor-default">Conferences</span></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-heading text-sm font-semibold text-white mb-4 uppercase tracking-wider">
                Resources
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/sign-up" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>&copy; {new Date().getFullYear()} EventSpace. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
