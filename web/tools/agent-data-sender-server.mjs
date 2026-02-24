import { RoomServiceClient, DataPacket_Kind } from "livekit-server-sdk";

const LIVEKIT_HOST = process.env.LIVEKIT_HOST; // https://ai-voice-xxxx.livekit.cloud
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

const ROOM = process.env.ROOM || "okk-easy";

if (!LIVEKIT_HOST || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.error("Need env: LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET");
  process.exit(1);
}

const roomService = new RoomServiceClient(
  LIVEKIT_HOST,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);

function encode(obj) {
  return new TextEncoder().encode(JSON.stringify(obj));
}

async function ensureRoom() {
  try {
    await roomService.createRoom({ name: ROOM, emptyTimeout: 60, maxParticipants: 20 });
    console.log("Room created:", ROOM);
  } catch (e) {
    // если уже существует — ок
  }
}

async function main() {
  console.log("Sending data to room:", ROOM);
  await ensureRoom();

  let i = 1;
  setInterval(async () => {
    const msg = {
      type: "transcript",
      role: "client",
      text: `Тестовая реплика от агента #${i++}`,
      t: new Date().toLocaleTimeString(),
    };

    try {
      // 1) берем список участников
      const participants = await roomService.listParticipants(ROOM);
      const identities = participants.map((p) => p.identity);

      if (identities.length === 0) return;

      // 2) sendData: room, data, kind, options
      await roomService.sendData(
        ROOM,
        encode(msg),
        DataPacket_Kind.RELIABLE,
        { destinationIdentities: identities }
      );

      process.stdout.write(".");
    } catch (e) {
      console.error("\nsendData error:", e?.message || e);
    }
  }, 2000);
}

main();