import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SoiréeSpace Blog — Tips & Guides for Event Planners";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "60px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: "#f43f5e",
              color: "white",
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            E
          </div>
          <span style={{ fontSize: "28px", fontWeight: 700, color: "#44403c" }}>
            SoiréeSpace
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "#1c1917",
            lineHeight: 1.2,
            marginBottom: "20px",
          }}
        >
          Event Planning Blog
        </div>
        <div
          style={{
            fontSize: "24px",
            color: "#78716c",
            lineHeight: 1.5,
            maxWidth: "800px",
          }}
        >
          Expert guides, templates, and best practices for professional event planners.
        </div>

        <div style={{ flex: 1 }} />

        {/* Categories */}
        <div style={{ display: "flex", gap: "12px" }}>
          {["Floor Plans", "Contracts", "Timelines", "Client Portal", "Seating"].map(
            (cat) => (
              <span
                key={cat}
                style={{
                  fontSize: "16px",
                  color: "#f43f5e",
                  backgroundColor: "#fff1f2",
                  padding: "8px 20px",
                  borderRadius: "20px",
                  fontWeight: 600,
                }}
              >
                {cat}
              </span>
            )
          )}
        </div>
      </div>
    ),
    size
  );
}
