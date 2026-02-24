import os
import asyncio
import json
import audioop
from datetime import datetime

import aiohttp
from vosk import Model, KaldiRecognizer
from livekit import rtc


NEXT_BASE = os.environ.get("NEXT_BASE", "http://localhost:3000")
ROOM = os.environ.get("ROOM", "okk-easy")
IDENTITY = os.environ.get("IDENTITY", "ai-stt")
NAME = os.environ.get("NAME", "AI STT")
VOSK_MODEL_DIR = os.environ.get("VOSK_MODEL_DIR", "agent/models/vosk-ru")

# Vosk ожидает 16k mono PCM16
TARGET_SR = 16000


def encode(obj: dict) -> bytes:
    return json.dumps(obj, ensure_ascii=False).encode("utf-8")


async def fetch_token() -> tuple[str, str]:
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


async def send_transcript(room: rtc.Room, role: str, text: str):
    msg = {
        "type": "transcript",
        "role": role,  # "you" / "client"
        "text": text,
        "t": datetime.now().strftime("%H:%M:%S"),
    }
    # publish_data у тебя принимает reliable как keyword
    await room.local_participant.publish_data(encode(msg), reliable=True)


def to_16k_mono_pcm16(pcm: bytes, src_rate: int, channels: int) -> bytes:
    """
    Приводим входной PCM16 к 16kHz mono PCM16.
    Используем стандартный audioop (быстро и без тяжелых зависимостей).
    """
    # pcm уже PCM16 (2 bytes sample). Если channels>1 — усредняем.
    if channels == 2:
        pcm = audioop.tomono(pcm, 2, 0.5, 0.5)
    elif channels > 2:
        # грубо: берём первый канал (лучше не надо, но для MVP ок)
        pcm = audioop.tomono(pcm, 2, 1.0, 0.0)

    if src_rate != TARGET_SR:
        pcm, _ = audioop.ratecv(pcm, 2, 1, src_rate, TARGET_SR, None)

    return pcm


async def stt_loop(room: rtc.Room, track):
    """
    Читает аудио-фреймы из LiveKit, кормит Vosk, при финальном результате шлёт в UI.
    """
    if not os.path.isdir(VOSK_MODEL_DIR):
        raise RuntimeError(f"Vosk model dir not found: {VOSK_MODEL_DIR}")

    model = Model(VOSK_MODEL_DIR)
    rec = KaldiRecognizer(model, TARGET_SR)
    rec.SetWords(True)

    # AudioStream позволяет получать AudioFrame из трека
    stream = rtc.AudioStream(track)

    await send_transcript(room, "client", "STT агент подключён. Говорите в микрофон — я распознаю вашу речь.")

    async for event in stream:
        frame = event.frame  # rtc.AudioFrame

        # В Python SDK обычно так: frame.data (bytes), frame.sample_rate, frame.num_channels
        pcm = frame.data
        src_rate = frame.sample_rate
        ch = frame.num_channels

        pcm16 = to_16k_mono_pcm16(pcm, src_rate, ch)

        # Vosk принимает bytes PCM16 mono 16k
        if rec.AcceptWaveform(pcm16):
            res = json.loads(rec.Result())
            text = (res.get("text") or "").strip()
            if text:
                # это речь менеджера => role="you"
                await send_transcript(room, "you", text)
        else:
            # partial можно тоже слать, но это заспамит UI
            # partial = json.loads(rec.PartialResult()).get("partial", "").strip()
            pass


async def main():
    token, url = await fetch_token()
    print("Token received. URL:", url, "ROOM:", ROOM, "IDENTITY:", IDENTITY)

    room = rtc.Room()

    # Подписка на аудио треки других участников
    @room.on("track_subscribed")
    def _on_track_subscribed(track, publication, participant):
        try:
            # интересует только аудио от менеджера
            if publication.kind != rtc.TrackKind.KIND_AUDIO:
                return

            # отфильтруем самого себя
            if participant.identity == IDENTITY:
                return

            print("Subscribed to audio from:", participant.identity, "track:", publication.sid)

            # запускаем STT в фоне
            asyncio.create_task(stt_loop(room, track))

        except Exception as e:
            print("track_subscribed handler error:", e)

    await room.connect(url, token)
    print("Connected to LiveKit room.")

    # держим процесс живым
    while True:
        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(main())