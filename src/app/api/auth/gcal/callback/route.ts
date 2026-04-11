import { auth } from "@/lib/auth";
import { getOAuth2Client } from "@/lib/gcal";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  // Return refresh token to display — admin must copy it to .env
  const refreshToken = tokens.refresh_token;

  return new NextResponse(`
    <html><body style="font-family:monospace;padding:2rem;background:#f8fafc">
      <h2 style="color:#16a34a">✓ Google Calendar Connected!</h2>
      <p>Copy this refresh token to your <code>.env</code> file:</p>
      <pre style="background:#1e293b;color:#86efac;padding:1rem;border-radius:8px;word-break:break-all">GOOGLE_CALENDAR_REFRESH_TOKEN=${refreshToken}</pre>
      <p style="color:#64748b">After adding it, restart the server. You can close this window.</p>
    </body></html>
  `, { headers: { "Content-Type": "text/html" } });
}
