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
        {/* Slash in a rounded box — matches SquareSlash icon */}
        <div
          style={{
            width: 22,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #3B82F6",
            borderRadius: 4,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#3B82F6",
              lineHeight: 1,
              marginTop: -1,
            }}
          >
            /
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
