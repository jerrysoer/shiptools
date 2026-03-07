import { ImageResponse } from "next/og";

export const alt = "Uploadless — Privacy-First Browser Tools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#151311",
          backgroundImage:
            "radial-gradient(circle at 50% 50%, #1A1918 0%, #151311 70%)",
        }}
      >
        {/* Monogram accent */}
        <span
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "#D4704A",
            fontFamily: "Georgia, serif",
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          U
        </span>

        {/* Accent line */}
        <div
          style={{
            width: 48,
            height: 2,
            backgroundColor: "#D4704A",
            marginBottom: 28,
            borderRadius: 1,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#E5E0DB",
            letterSpacing: "3px",
            marginBottom: 16,
            fontFamily: "Georgia, serif",
          }}
        >
          Uploadless
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "#8C8580",
            maxWidth: 600,
            textAlign: "center",
          }}
        >
          Privacy-First Browser Tools
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 18,
            color: "#5C5652",
            letterSpacing: "2px",
          }}
        >
          Zero uploads. Zero tracking.
        </div>
      </div>
    ),
    { ...size }
  );
}
