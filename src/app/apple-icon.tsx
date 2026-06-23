import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffaf0",
        }}
      >
        <div
          style={{
            width: 148,
            height: 148,
            borderRadius: "50%",
            background: "#fbbf24",
            border: "8px solid #0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 32 32" width="118" height="118">
            <path
              d="M6 16 H8 L11 11 L14 22 L17 6 L20 26 L23 12 L26 16 H29"
              fill="none"
              stroke="#0a0a0a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
