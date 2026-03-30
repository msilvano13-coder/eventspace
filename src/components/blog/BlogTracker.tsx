"use client";

import { useEffect } from "react";
import { trackBlogViewed } from "@/lib/analytics";

export default function BlogTracker({ slug, category }: { slug: string; category: string }) {
  useEffect(() => {
    trackBlogViewed(slug, category);
  }, [slug, category]);

  return null;
}
