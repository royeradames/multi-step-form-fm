import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteName } from "./site";

export const alt = "Multi-step Form: Frontend Mentor's gaming plan selection and subscription summary";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const icon = await readFile(join(process.cwd(), "public/icon.svg"));
  const src = `data:image/svg+xml;base64,${icon.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 64, background: "#eef5ff", color: "#02295a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 36 }}><img src={src} width={72} height={72} alt="" /><div style={{ fontSize: 48, fontWeight: 700 }}>{siteName}</div></div>
        <div style={{ display: "flex", gap: 36, padding: 36, background: "#fff", borderRadius: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, padding: 24, width: 240, background: "#483eff", borderRadius: 12, color: "#fff", fontSize: 24 }}>
            <div>1 Your info</div><div>2 Select plan</div><div>3 Add-ons</div><div>4 Summary</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}>
            <div style={{ fontSize: 36, fontWeight: 700 }}>Finishing up</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}><div>Arcade (Monthly)</div><div>$9/mo</div></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#707386" }}><div>Online service</div><div>+$1/mo</div></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#707386" }}><div>Larger storage</div><div>+$2/mo</div></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#483eff", fontWeight: 700 }}><div>Total (per month)</div><div>+$12/mo</div></div>
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#483eff", marginTop: 24 }}>A Frontend Mentor challenge</div>
      </div>
    ), size,
  );
}
