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
  ChevronRight,
  Check,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  Grid3X3,
  Receipt,
  Camera,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Dashboard & Calendar",
    description:
      "See every event at a glance. Filter by status, search by name or venue, and switch between grid and calendar views.",
  },
  {
    icon: Grid3X3,
    title: "Interactive Floor Plans & 3D View",
    description:
      "Drag-and-drop furniture, lighting zones, and room shapes onto a live canvas. Switch to a stunning 3D view with venue presets, realistic lighting, and detailed furniture — perfect for client proposals.",
  },
  {
    icon: Users,
    title: "Guest Management & Smart Seating",
    description:
      "Track RSVPs, meal choices, dietary needs, and plus-ones. Auto-assign seats with our smart algorithm that respects VIP priority, group cohesion, and keep-together rules.",
  },
  {
    icon: ClipboardList,
    title: "Vendor & Payment Tracking",
    description:
      "Manage vendors by category, track contract totals, and log individual payments with due dates and paid status.",
  },
  {
    icon: FileSignature,
    title: "Contracts & E-Signatures",
    description:
      "Create contracts from templates, collect dual e-signatures (planner + client), and track signing status in real time.",
  },
  {
    icon: Receipt,
    title: "Invoices & Finances",
    description:
      "Generate line-item invoices, track expenses across events, and view financial reports from one dashboard.",
  },
  {
    icon: CalendarDays,
    title: "Day-of Timeline",
    description:
      "Build a minute-by-minute schedule your team and clients can follow. Drag to reorder on desktop or mobile. Export to PDF for day-of binders.",
  },
  {
    icon: MessageSquare,
    title: "Client Messaging",
    description:
      "Chat with clients directly inside the event. No more digging through email threads.",
  },
  {
    icon: Palette,
    title: "Mood Boards & Color Palettes",
    description:
      "Upload inspiration images with auto-compression and define color palettes your clients can view instantly.",
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
      "Give every client their own portal with your logo, brand colors, and tagline. They see schedules, RSVP, manage guests, sign contracts, download files, and message you — all in one place.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Create your planner profile",
    description:
      "Add your business name, logo, brand color, and tagline. This branding appears on your client portal.",
  },
  {
    number: "02",
    title: "Add an event",
    description:
      "Enter the event name, date, venue, and client info. EventSpace generates a unique client portal link automatically.",
  },
  {
    number: "03",
    title: "Plan every detail",
    description:
      "Build floor plans, manage vendors, track guests, create timelines, send contracts — all from one dashboard.",
  },
  {
    number: "04",
    title: "Share with your client",
    description:
      "Clients open their portal to view schedules, RSVP guests, sign contracts, answer questionnaires, and message you directly.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the difference between DIY and Professional?",
    a: "The DIY plan is a one-time purchase (currently $99, 50% off the regular $199) — perfect for planning a single event like your wedding or a big party. It includes floor plans with 3D visualization, smart seating, guest management, timelines, mood boards, layout templates, and PDF export. Professional is $20/month and unlocks unlimited events plus business tools like invoicing, e-signatures, questionnaires, and a branded client portal.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. EventSpace runs entirely in your browser. Just open the app and start planning. It works on desktop, tablet, and mobile.",
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
            <a href="#features" className="text-stone-600 hover:text-stone-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-stone-600 hover:text-stone-900 transition-colors">
              How It Works
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
              <a href="#features" className="text-stone-600 py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#how-it-works" className="text-stone-600 py-2" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
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
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/80 via-stone-50 to-amber-50/40" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-4 py-1.5 mb-6">
            <Sparkles size={14} />
            <span>Professional event planning software — try free for 30 days</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 max-w-4xl mx-auto leading-[1.1]">
            Plan Unforgettable Events.{" "}
            <span className="text-rose-500">Delight Every Client.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
            3D floor plans, smart seating, vendor tracking, guest management,
            contracts, timelines, and a branded client portal — everything
            professional event planners need in one place.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-medium text-white bg-rose-500 hover:bg-rose-600 px-8 py-3.5 rounded-xl transition-colors shadow-md shadow-rose-200"
            >
              Start Your Free Trial
              <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-medium text-stone-700 bg-white hover:bg-stone-100 px-8 py-3.5 rounded-xl transition-colors border border-stone-200"
            >
              See All Features
            </a>
          </div>

          <p className="mt-6 text-sm text-stone-400">
            30-day free trial on Professional &middot; No credit card required to start
          </p>
        </div>
      </header>


      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900">
              Everything You Need to Plan Like a Pro
            </h2>
            <p className="mt-4 text-lg text-stone-500 max-w-2xl mx-auto">
              One platform for floor plans, vendors, guests, contracts, timelines,
              and client communication.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-stone-100 shadow-soft hover:shadow-card transition-shadow"
              >
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

      {/* ── How It Works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white border-y border-stone-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900">
              Up and Running in Minutes
            </h2>
            <p className="mt-4 text-lg text-stone-500 max-w-2xl mx-auto">
              No setup wizards, no onboarding calls. Open EventSpace and start
              planning your first event.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.number} className="relative">
                {i < STEPS.length - 1 && (
                  <ChevronRight
                    size={20}
                    className="hidden lg:block absolute -right-4 top-8 text-stone-300"
                  />
                )}
                <span className="font-heading text-4xl font-bold text-rose-100">
                  {s.number}
                </span>
                <h3 className="mt-2 font-heading text-lg font-semibold text-stone-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-28 bg-white border-y border-stone-100">
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
              <p className="mt-5 mb-4 text-xs text-stone-400 font-medium uppercase tracking-wider">Perfect for one event</p>
              <ul className="space-y-3 text-sm text-stone-600">
                {[
                  "1 active event",
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
                  "PDF floor plan export",
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
              <p className="mt-5 mb-4 text-xs text-stone-400 font-medium uppercase tracking-wider">Everything in DIY, plus</p>
              <ul className="space-y-3 text-sm text-stone-600">
                {[
                  "Unlimited events",
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
      <section id="faq" className="py-20 sm:py-28">
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
            Ready to Streamline Your Events?
          </h2>
          <p className="mt-4 text-lg text-rose-100 max-w-xl mx-auto">
            Plan smarter with EventSpace. Try Professional free for 30 days.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-medium text-rose-600 bg-white hover:bg-rose-50 px-8 py-3.5 rounded-xl transition-colors shadow-md"
            >
              Get Started
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
                Event planning software for professionals. Floor plans, vendors,
                guests, contracts, and a client portal — all in one place.
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
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
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
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>&copy; {new Date().getFullYear()} EventSpace. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
