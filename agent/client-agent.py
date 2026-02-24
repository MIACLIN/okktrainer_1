import os
import asyncio
import json
from datetime import datetime

import aiohttp
from livekit import rtc


NEXT_BASE = os.environ.get("NEXT_BASE", "http://localhost:3000")
ROOM = os.environ.get("ROOM", "okk-easy")
IDENTITY = os.environ.get("IDENTITY", "ai-client")
NAME = os.environ.get("NAME", "AI Client")


async def fetch_token() -> tuple[str, str]:
    """
    Берём токен у твоего Next API:
    POST /api/livekit/token {room, identity, name} -> {token, url}
    """
    endpoint = f"{NEXT_BASE}/api/livekit/token"
    payload = {"room": ROOM, "identity": IDENTITY, "name": NAME}

    async with aiohttp.ClientSession() as session:
        async with session.post(endpoint, json=payload, timeout=20) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise RuntimeError(f"Token API error {resp.status}: {text}")
            data = await resp.json()

    token = data.get("token")
    url = data.get("url")
    if not token or not url:
        raise RuntimeError(f"Invalid token response: {data}")

    return token, url


def encode(obj: dict) -> bytes:
    return json.dumps(obj, ensure_ascii=False).encode("utf-8")


async def main():
    token, url = await fetch_token()
    print("Token received. URL:", url, "ROOM:", ROOM, "IDENTITY:", IDENTITY)

    room = rtc.Room()

    # Подключаемся как полноценный участник WebRTC
    await room.connect(url, token)
    print("Connected to LiveKit room.")

    # Каждые 2 секунды отправляем "реплику клиента" в data channel
    i = 1
    while True:
        msg = {
            "type": "transcript",
            "role": "client",
            "text": f"Python агент в комнате. Реплика #{i}",
            "t": datetime.now().strftime("%H:%M:%S"),
        }
        i += 1

        await room.local_participant.publish_data(
    encode(msg),
    reliable=True,

        )

        await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())