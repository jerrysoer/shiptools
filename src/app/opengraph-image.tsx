import { ImageResponse } from "next/og";

export const alt = "ShipTools — Developer & Privacy Tools";
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
          backgroundColor: "#0A0E17",
          backgroundImage:
            "radial-gradient(circle at 50% 50%, #131A2B 0%, #0A0E17 70%)",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
            border: "3px solid #3B82F6",
            borderRadius: 18,
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#3B82F6",
              lineHeight: 1,
            }}
          >
            /
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#F1F5F9",
            letterSpacing: "-1px",
            marginBottom: 16,
          }}
        >
          ShipTools
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "#94A3B8",
            maxWidth: 600,
            textAlign: "center",
          }}
        >
          Developer & privacy tools that run entirely in your browser
        </div>
      </div>
    ),
    { ...size }
  );
}
