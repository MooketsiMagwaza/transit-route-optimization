/** Generated social card using the same route-loop identity as the public site. */

import { ImageResponse } from "next/og";

export const alt = "Tsela — know which combi gets you there";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", padding: 70, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", color: "#1f1f1f" }}><div style={{ display: "flex", alignItems: "center", gap: 22 }}><div style={{ width: 76, height: 76, display: "flex", alignItems: "center", justifyContent: "center", border: "5px solid #146c2e", borderRadius: 24, background: "#146c2e", color: "#fff", fontSize: 36, fontWeight: 800 }}>↝</div><span style={{ fontSize: 42, fontWeight: 800 }}>Tsela</span></div><div style={{ display: "flex", flexDirection: "column" }}><span style={{ color: "#0b57d0", fontSize: 24, fontWeight: 700 }}>Gaborone combi routes</span><strong style={{ width: 950, marginTop: 18, fontSize: 92, lineHeight: .92, letterSpacing: -5 }}>Know which combi gets you there.</strong></div><div style={{ width: "100%", height: 10, display: "flex", borderRadius: 20, background: "#146c2e" }} /></div>, size);
}
