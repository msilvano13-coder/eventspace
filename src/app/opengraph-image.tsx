import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SoiréeSpace — Event Planning Software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #fdf9f3 0%, #f6f2fa 50%, #fef1ec 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 100,
            height: 100,
            borderRadius: 24,
            background: "linear-gradient(135deg, #b8a9c9, #f2c4c4)",
            marginBottom: 32,
            fontSize: 72,
            color: "white",
            fontStyle: "italic",
          }}
        >
          S
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#3d3346",
            letterSpacing: "-1px",
            marginBottom: 16,
          }}
        >
          SoiréeSpace
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: "#9b8faa",
            maxWidth: 600,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Every little magical detail.
        </div>

        {/* Subtle bottom accent */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
          }}
        >
          {["#b8a9c9", "#f2c4c4", "#b5c9b3", "#fad4c0", "#f5e6c0"].map(
            (color) => (
              <div
                key={color}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: color,
                }}
              />
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
