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
    print("PREWARM EXECUTED")

    proc.userdata["vad"] = silero.VAD.load()

    proc.userdata["stt"] = FasterWhisperSTT(
        model_size="tiny",
        device="cpu",
        compute_type="int8",
        language="ru",
        vad_filter=True,
        beam_size=1,
    )

server.setup_fnc = prewarm


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    stt = ctx.proc.userdata["stt"]
    vad = ctx.proc.userdata["vad"]

    # Берём прогретые компоненты

    stt = ctx.proc.userdata["stt"]
    tts = ctx.proc.userdata["tts"]
    vad = ctx.proc.userdata["vad"]

    # LLM через Ollama — можно оставить здесь (он лёгкий), но модель/URL поправим
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3:8b")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
    llm = lk_openai.LLM.with_ollama(model=ollama_model, base_url=base_url)

    session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,     # None допустим, агент будет “текстовым”
        vad=vad,
        allow_interruptions=False,
)

    logger.info(f"Starting patient-ai in room={room_name} identity={identity}")

    await session.start(
        agent=PatientAgent(),
        room=ctx.room,
    )


if __name__ == "__main__":
    cli.run_app(server)
