import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request) {
  const body = await req.json();
  const room = body.room ?? body.roomName ?? "okk-easy";
  const identity = body.identity ?? body.participantName ?? "manager";
  const name = body.name ?? identity;

  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;
  const at = new AccessToken(apiKey, apiSecret, { identity, name });
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

  const token = await at.toJwt();
  return NextResponse.json({ token });
}