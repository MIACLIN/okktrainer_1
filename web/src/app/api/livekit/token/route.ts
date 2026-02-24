import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: Request) {
  const { room, identity, name } = await req.json();

  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET" },
      { status: 500 }
    );
  }
  if (!room || !identity) {
    return NextResponse.json({ error: "room and identity are required" }, { status: 400 });
  }

  const token = new AccessToken(apiKey, apiSecret, { identity, name });
  token.addGrant({ roomJoin: true, room });

  return NextResponse.json({ token: await token.toJwt(), url });
}