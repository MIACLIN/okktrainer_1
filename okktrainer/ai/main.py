import os
import logging
from dotenv import load_dotenv

from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
)
from livekit.plugins import silero, openai as lk_openai
from local_livekit_plugins import FasterWhisperSTT, PiperTTS

logger = logging.getLogger("patient-ai")
logging.basicConfig(level=logging.INFO)
load_dotenv()


class PatientAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "Ты — клиент (пациент) в роли для тренировки продаж/консультаций. "
                "Отвечай естественно, короткими фразами. "
                "Если менеджер задаёт вопрос — отвечай по существу, иногда уточняй. "
                "Не используй эмодзи, звездочки, markdown. "
                "Язык: русский."
            )
        )

    async def on_enter(self):
        # Первое приветствие — полезно, чтобы менеджер сразу понял, что “пациент” живой
        self.session.generate_reply(allow_interruptions=False)


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    room_name = os.getenv("ROOM_NAME", "sales-room")
    identity = os.getenv("IDENTITY", "patient-ai")

    # 1) Local STT
    stt = FasterWhisperSTT(
        model_size=os.getenv("WHISPER_MODEL_SIZE", "small"),
        device=os.getenv("WHISPER_DEVICE", "cpu"),
        compute_type="int8",      # CPU-friendly
        language="ru",
        vad_filter=True,
    )

    # 2) Local TTS
    piper_model = os.getenv("PIPER_MODEL_PATH", "/models/piper/en_US-ryan-high.onnx")
    tts = PiperTTS(
        model_path=piper_model,
        use_cuda=False,
        speed=1.0,
    )

    # 3) Local LLM via Ollama
    # LiveKit docs: Ollama base_url по умолчанию http://localhost:11434/v1, мы задаём свой через env
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434/v1")
    llm = lk_openai.LLM.with_ollama(model=ollama_model, base_url=base_url)

    session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=ctx.proc.userdata["vad"],
        # на бесплатном стеке лучше не пытаться “перебивать” — будет каша
        allow_interruptions=False,
    )

    logger.info(f"Starting patient-ai in room={room_name} identity={identity}")

    await session.start(
        agent=PatientAgent(),
        room=ctx.room,
    )


if __name__ == "__main__":
    cli.run_app(server)
