import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasUrl: Boolean(process.env.LIVEKIT_URL),
    hasKey: Boolean(process.env.LIVEKIT_API_KEY),
    hasSecret: Boolean(process.env.LIVEKIT_API_SECRET),
    urlPrefix: process.env.LIVEKIT_URL?.slice(0, 6) ?? null,
  });
}