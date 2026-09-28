/** Temporary gallery for reviewing the illustrations; removed before commit. */

import { TselaArt, type ArtName } from "@/components/tsela-art";

const NAMES: ArtName[] = ["combi", "stop", "map", "community", "guide", "success"];

export default function ArtPreview() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, padding: 20 }}>
      {NAMES.map((name) => <div key={name} style={{ background: "#fff", borderRadius: 20, padding: 16 }}><TselaArt name={name} /></div>)}
    </div>
  );
}
