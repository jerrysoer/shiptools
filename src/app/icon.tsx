import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0E17",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 0,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#3B82F6",
              letterSpacing: "-0.5px",
              lineHeight: 1,
            }}
          >
            S
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#F1F5F9",
              letterSpacing: "-0.5px",
              lineHeight: 1,
            }}
          >
            T
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
