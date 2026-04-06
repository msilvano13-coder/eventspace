import Link from "next/link";
import { blogPosts } from "@/lib/blog-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Planning Blog — Tips, Templates & Guides | SoiréeSpace",
  description:
    "Expert guides for professional event planners: floor plans, contracts, timelines, seating charts, and client management. Free templates and actionable tips.",
  keywords: [
    "event planning blog",
    "wedding planner tips",
    "event planner guides",
    "event planning templates",
    "event industry resources",
  ],
  openGraph: {
    title: "Event Planning Blog | SoiréeSpace",
    description:
      "Expert guides for professional event planners: floor plans, contracts, timelines, seating charts, and client management.",
    type: "website",
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-heading font-bold text-stone-800">
            <span className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">E</span>
            SoiréeSpace
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/#pricing" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
              Pricing
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-xl transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
          &larr; Back to SoiréeSpace
        </Link>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 mt-4">
          Event Planning Blog
        </h1>
        <p className="text-stone-500 mt-2 max-w-2xl">
          Actionable guides, templates, and best practices for professional event planners.
        </p>
      </header>

      {/* Post Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-2xl border border-stone-100 shadow-soft hover:shadow-card transition-shadow overflow-hidden"
            >
              <div className="h-36 bg-gradient-to-br from-rose-50 to-stone-100 flex items-center justify-center">
                <span className="text-5xl">{post.heroEmoji}</span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-stone-400">{post.readingTime}</span>
                </div>
                <h2 className="font-heading font-semibold text-stone-800 leading-snug group-hover:text-rose-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-stone-500 mt-2 line-clamp-2">{post.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* CTA */}
      <section className="bg-gradient-to-r from-rose-500 to-rose-600 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">
            Ready to Plan Smarter?
          </h2>
          <p className="text-rose-100 mt-2">
            Try SoiréeSpace free for 30 days. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="inline-block mt-6 px-8 py-3.5 bg-white text-rose-600 font-medium rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-stone-500">&copy; {new Date().getFullYear()} SoiréeSpace. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-stone-500 hover:text-stone-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-sm text-stone-500 hover:text-stone-300 transition-colors">Terms</Link>
            <Link href="/blog" className="text-sm text-stone-500 hover:text-stone-300 transition-colors">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
