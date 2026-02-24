import os
import asyncio
import math
import struct
import signal
from dotenv import load_dotenv

from livekit import rtc
from livekit.api import AccessToken, VideoGrants

load_dotenv()

ROOM = "sales-room"
IDENTITY = "client-bot"

def mint_token() -> str:
    api_key = os.environ["LIVEKIT_API_KEY"]
    api_secret = os.environ["LIVEKIT_API_SECRET"]

    at = (
        AccessToken(api_key, api_secret)
        .with_identity(IDENTITY)
        .with_grants(VideoGrants(room_join=True, room=ROOM))
    )
    return at.to_jwt()

async def play_beep(source: rtc.AudioSource, duration_sec: float = 2.0, freq: float = 440.0):
    sample_rate = 48000
    total_samples = int(sample_rate * duration_sec)
    frame_samples = 480  # 10ms
    t = 0

    while t < total_samples:
        n = min(frame_samples, total_samples - t)
        pcm = bytearray()
        for i in range(n):
            sample = int(0.2 * 32767 * math.sin(2 * math.pi * freq * (t + i) / sample_rate))
            pcm += struct.pack("<h", sample)

        await source.capture_frame(rtc.AudioFrame(pcm, sample_rate, 1, n))

        # pacing: отправляем как в реальном времени
        await asyncio.sleep(n / sample_rate)
        t += n

async def main():
    url = os.environ["LIVEKIT_URL"]
    token = mint_token()

    room = rtc.Room()
    await room.connect(url, token)
    print(f"✅ Bot connected. room={room.name} identity={IDENTITY}")

    # publish audio track
    source = rtc.AudioSource(48000, 1)
    track = rtc.LocalAudioTrack.create_audio_track("beep", source)
    await room.local_participant.publish_track(track)

    await play_beep(source)

    stop_event = asyncio.Event()

    def _stop(*_):
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _stop)
        except NotImplementedError:
            # windows fallback
            signal.signal(sig, lambda *_: _stop())

    print("⏹️  Press Ctrl+C to stop bot.")
    await stop_event.wait()

    await room.disconnect()
    print("👋 Bot disconnected.")

if __name__ == "__main__":
    asyncio.run(main())