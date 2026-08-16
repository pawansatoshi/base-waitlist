import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function validEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown; fid?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const fid = typeof body.fid === "number" && Number.isSafeInteger(body.fid) ? body.fid : null;

    if (!validEmail(email)) {
      return NextResponse.json({ success: false, message: "Please enter a valid email address" }, { status: 400 });
    }

    const webhook = process.env.WAITLIST_WEBHOOK_URL;
    if (!webhook) {
      console.error("WAITLIST_WEBHOOK_URL is not configured");
      return NextResponse.json(
        { success: false, message: "Waitlist service is temporarily unavailable" },
        { status: 503 },
      );
    }

    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fid, submittedAt: new Date().toISOString() }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Waitlist webhook failed", response.status);
      return NextResponse.json(
        { success: false, message: "Unable to join the waitlist right now" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist submission failed", error);
    return NextResponse.json(
      { success: false, message: "Unable to join the waitlist right now" },
      { status: 500 },
    );
  }
}
