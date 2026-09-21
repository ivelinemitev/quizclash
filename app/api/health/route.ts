import { after } from "next/server";

export async function GET() {
  const runtime =
    typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers"
      ? "cloudflare-workers"
      : "node";

  after(() => {
    console.log(`[health] checked at ${new Date().toISOString()}, runtime=${runtime}`);
  });

  return Response.json({ status: "ok", runtime });
}
