import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost } from "@/lib/blog-data";
import BlogTracker from "@/components/blog/BlogTracker";
import type { Metadata } from "next";

// ── Static generation for all blog posts ──
export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

// ── SEO metadata per post ──
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};

  const url = `https://eventspace.app/blog/${post.slug}`;

  return {
    title: `${post.title} | EventSpace`,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ["EventSpace Team"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: { canonical: url },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: "EventSpace",
      url: "https://eventspace.app",
    },
    publisher: {
      "@type": "Organization",
      name: "EventSpace",
      url: "https://eventspace.app",
      logo: {
        "@type": "ImageObject",
        url: "https://eventspace.app/og-image.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://eventspace.app/blog/${post.slug}`,
    },
    keywords: post.keywords.join(", "),
  };

  // Find adjacent posts for navigation
  const currentIndex = blogPosts.findIndex((p) => p.slug === post.slug);
  const prevPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-stone-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogTracker slug={post.slug} category={post.category} />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-heading font-bold text-stone-800">
            <span className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">E</span>
            EventSpace
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
              Blog
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

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-stone-400 mb-6">
          <Link href="/" className="hover:text-stone-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-stone-600 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-stone-500">{post.category}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-full">
              {post.category}
            </span>
            <span className="text-[11px] text-stone-400">{post.readingTime}</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
            {post.title}
          </h1>
          <p className="text-stone-500 mt-4 text-lg leading-relaxed">{post.description}</p>
          <div className="flex items-center gap-4 mt-6 text-sm text-stone-400">
            <time dateTime={post.publishedAt}>
              Published {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </time>
            {post.updatedAt !== post.publishedAt && (
              <span>
                &middot; Updated {new Date(post.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {post.sections.map((section, i) => (
            <section key={i}>
              <h2 className="font-heading text-xl sm:text-2xl font-semibold text-stone-800 mb-4">
                {section.heading}
              </h2>
              <div
                className="prose prose-stone prose-sm max-w-none
                  prose-p:text-stone-600 prose-p:leading-relaxed
                  prose-li:text-stone-600
                  prose-strong:text-stone-800
                  prose-a:text-rose-500 prose-a:no-underline hover:prose-a:text-rose-600
                  prose-h4:text-stone-700 prose-h4:font-semibold prose-h4:text-base prose-h4:mt-6
                  prose-table:text-sm prose-td:py-2 prose-td:pr-4"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </section>
          ))}
        </div>

        {/* CTA Box */}
        <div className="mt-14 bg-gradient-to-br from-rose-50 to-stone-50 border border-rose-100 rounded-2xl p-8 text-center">
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-stone-900">
            {post.cta.heading}
          </h3>
          <p className="text-stone-500 mt-2 max-w-lg mx-auto">{post.cta.description}</p>
          <Link
            href="/sign-up"
            className="inline-block mt-5 px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl shadow-md shadow-rose-200 transition-colors"
          >
            Start Your Free Trial
          </Link>
        </div>

        {/* Post Navigation */}
        <div className="mt-12 pt-8 border-t border-stone-200 grid gap-4 sm:grid-cols-2">
          {prevPost && (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="group p-4 rounded-xl border border-stone-100 hover:border-rose-200 bg-white hover:bg-rose-50/30 transition-colors"
            >
              <span className="text-[11px] text-stone-400">&larr; Previous</span>
              <p className="text-sm font-medium text-stone-700 group-hover:text-rose-600 transition-colors mt-1 line-clamp-2">
                {prevPost.title}
              </p>
            </Link>
          )}
          {nextPost && (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="group p-4 rounded-xl border border-stone-100 hover:border-rose-200 bg-white hover:bg-rose-50/30 transition-colors sm:text-right sm:col-start-2"
            >
              <span className="text-[11px] text-stone-400">Next &rarr;</span>
              <p className="text-sm font-medium text-stone-700 group-hover:text-rose-600 transition-colors mt-1 line-clamp-2">
                {nextPost.title}
              </p>
            </Link>
          )}
        </div>
      </article>

      {/* Footer */}
      <footer className="bg-stone-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-stone-500">&copy; {new Date().getFullYear()} EventSpace. All rights reserved.</p>
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
