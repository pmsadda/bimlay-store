import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // হেডার থেকে IP এবং User Agent বের করা
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const referrer = request.headers.get("referer") || "Direct";

    const { path } = await request.json();

    // ডাটাবেসে লগ সেভ করা
    await db.visitorLog.create({
      data: {
        ipAddress,
        userAgent,
        path: path || "/",
        referrer,
      },
    });

    return NextResponse.json({ success: true });
    } catch {
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}