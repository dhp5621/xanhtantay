import QRCode from "qrcode";

/** SVG QR for any same-site path, e.g. /api/qr/link?to=/farms/vuon-bac-ba */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get("to") ?? "/";
  if (!to.startsWith("/") || to.startsWith("//") || to.length > 300) return new Response("bad path", { status: 400 });
  const svg = await QRCode.toString(`${url.origin}${to}`, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#191C19", light: "#FFFFFF" } });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
