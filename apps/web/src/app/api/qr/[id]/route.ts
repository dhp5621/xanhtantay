import QRCode from "qrcode";

/** SVG QR code pointing at the public trace page for an order. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{2,64}$/.test(id)) return new Response("bad id", { status: 400 });
  const origin = new URL(req.url).origin;
  const target = `${origin}/tra-cuu/${id}`;
  const svg = await QRCode.toString(target, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#191C19", light: "#FFFFFF" } });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
