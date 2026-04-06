import { ImageResponse } from "next/og";
import { blogPosts, getBlogPost } from "@/lib/blog-data";

export const runtime = "edge";
export const alt = "SoiréeSpace Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export default function OGImage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#fafaf9",
            fontSize: 48,
            fontWeight: 700,
            color: "#1c1917",
          }}
        >
          SoiréeSpace Blog
        </div>
      ),
      size
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#fafaf9",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#f43f5e",
              color: "white",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            E
          </div>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#44403c",
            }}
          >
            SoiréeSpace
          </span>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontSize: "16px",
              color: "#f43f5e",
              backgroundColor: "#fff1f2",
              padding: "6px 16px",
              borderRadius: "20px",
              fontWeight: 600,
            }}
          >
            {post.category}
          </span>
        </div>

        {/* Emoji */}
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>
          {post.heroEmoji}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "#1c1917",
            lineHeight: 1.2,
            maxWidth: "900px",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {post.title}
        </div>

        {/* Bottom bar */}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            fontSize: "18px",
            color: "#78716c",
          }}
        >
          <span>{post.readingTime}</span>
          <span>·</span>
          <span>soireespace.com/blog</span>
        </div>
      </div>
    ),
    size
  );
}
