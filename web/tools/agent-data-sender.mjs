import { Room } from "livekit-client";

const url = process.env.LIVEKIT_URL;
const token = process.env.LIVEKIT_TOKEN;

if (!url || !token) {
  console.error("Need env LIVEKIT_URL and LIVEKIT_TOKEN");
  process.exit(1);
}

const room = new Room({ adaptiveStream: true, dynacast: true });
await room.connect(url, token);
console.log("Agent connected");

let i = 1;
setInterval(async () => {
  const msg = {
    type: "transcript",
    role: "client",
    text: `Тестовая реплика от агента #${i++}`,
    t: new Date().toLocaleTimeString(),
  };
  const payload = new TextEncoder().encode(JSON.stringify(msg));
  await room.localParticipant.publishData(payload, { reliable: true });
}, 2000);