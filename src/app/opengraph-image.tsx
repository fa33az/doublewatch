import { ImageResponse } from "next/og";

export const alt = "DoubleWatch - Multi-Screen YouTube Live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const pane = {
    flex: 1,
    height: 220,
    borderRadius: 16,
    border: "3px solid #29373d",
    background: "#1a2b32",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    padding: 18,
  } as const;

  const liveBadge = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 20, fontWeight: 700 }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: "#ec4c4f" }} />
      LIVE
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0f191e",
          color: "#fdfdfd",
        }}
      >
        <div style={{ display: "flex", gap: 24, marginBottom: 56 }}>
          <div style={pane}>{liveBadge}</div>
          <div style={pane}>{liveBadge}</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>DoubleWatch</div>
        <div style={{ fontSize: 30, color: "#a6abac", marginTop: 12 }}>
          Tonton beberapa YouTube live sekaligus, dengan crossfader audio.
        </div>
      </div>
    ),
    size,
  );
}
