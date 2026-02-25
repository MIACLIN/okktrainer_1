"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  type RemoteParticipant,
} from "livekit-client";

type Role = "client" | "manager" | "system";
type TranscriptItem = { id: string; role: Role; text: string; t?: string };

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function CallPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const client = (sp.get("client") ?? "easy") as "easy" | "medium" | "hard";
  const scenario = sp.get("scenario") ?? ""; // пока не используется, оставил

  // room naming: okk-easy / okk-medium / okk-hard
  const roomName = useMemo(() => `okk-${client}`, [client]);

  // ✅ LiveKit server URL из env
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  // LiveKit state
  const roomRef = useRef<Room | null>(null);
  const localTrackRef = useRef<Track.LocalAudioTrack | null>(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micOn, setMicOn] = useState(true);

  const [dataChannelReady, setDataChannelReady] = useState(false);
  const [remoteAudioPresent, setRemoteAudioPresent] = useState(false);

  const [identity] = useState<string>(() => `manager-${uid().slice(0, 5)}`);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([
    {
      id: uid(),
      role: "client",
      text: "Привет. Расскажите, что вы предлагаете?",
      t: new Date().toLocaleTimeString(),
    },
  ]);

  const [lastEvent, setLastEvent] = useState<string>("Готов к подключению");
  const [error, setError] = useState<string | null>(null);

  function pushTranscript(role: Role, text: string) {
    setTranscript((prev) => [
      ...prev,
      { id: uid(), role, text, t: new Date().toLocaleTimeString() },
    ]);
  }

  async function connect() {
    setError(null);

    // ✅ жёсткая проверка: без wsUrl LiveKit не подключится
    if (!serverUrl) {
      setError("NEXT_PUBLIC_LIVEKIT_URL не задан в .env.local");
      setLastEvent("Ошибка конфигурации");
      return;
    }
    if (!/^wss?:\/\//.test(serverUrl)) {
      setError(`NEXT_PUBLIC_LIVEKIT_URL должен начинаться с ws:// или wss:// (сейчас: ${serverUrl})`);
      setLastEvent("Ошибка конфигурации");
      return;
    }

    setConnecting(true);
    setLastEvent("Запрашиваю токен…");

    try {
      // ✅ Токен запрашиваем POST-ом
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomName, identity }),
      });

      if (!res.ok) throw new Error(`token endpoint failed: ${res.status}`);
      const data = await res.json();
      const token = data?.token;
      if (!token) throw new Error("token endpoint вернул пустой token");

      setLastEvent("Подключаюсь к LiveKit…");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // listeners
      room.on(RoomEvent.Connected, () => {
        setConnected(true);
        setConnecting(false);
        setLastEvent("Подключено");
      });

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setConnecting(false);
        setDataChannelReady(false);
        setRemoteAudioPresent(false);
        setLastEvent("Отключено");
      });

      room.on(RoomEvent.DataReceived, (payload, participant) => {
        setDataChannelReady(true);

        try {
          const msg = JSON.parse(new TextDecoder().decode(payload));
          if (msg?.type === "transcript" && msg?.text) {
            pushTranscript(msg.role === "manager" ? "manager" : "client", msg.text);
            setLastEvent(
              `data: ${participant?.identity ?? "unknown"} → ${String(msg.role ?? "")}`
            );
          } else {
            setLastEvent("data: непонятное сообщение");
          }
        } catch {
          setLastEvent("data: не JSON");
        }
      });

      room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
        setLastEvent(`Участник подключён: ${p.identity}`);
      });

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) setRemoteAudioPresent(true);
      });

      // ✅ ВАЖНО: тут было url (не определено). Должно быть serverUrl.
      await room.connect(serverUrl, token);

      // local mic
      setLastEvent("Включаю микрофон…");
      const micTrack = await createLocalAudioTrack();
      localTrackRef.current = micTrack;

      await room.localParticipant.publishTrack(micTrack);
      micTrack.mute(!micOn);

      setLastEvent("Готово: говорите");
    } catch (e: any) {
      setConnecting(false);
      setConnected(false);
      setError(e?.message ?? "connect error");
      setLastEvent("Ошибка подключения");
    }
  }

  async function disconnect() {
    setError(null);
    setLastEvent("Завершаю…");

    try {
      const room = roomRef.current;

      if (localTrackRef.current) {
        try {
          await room?.localParticipant.unpublishTrack(localTrackRef.current);
        } catch {}
        localTrackRef.current.stop();
        localTrackRef.current = null;
      }

      room?.disconnect();
      roomRef.current = null;
    } finally {
      setConnected(false);
      setConnecting(false);
      setDataChannelReady(false);
      setRemoteAudioPresent(false);
      setLastEvent("Завершено");
    }
  }

  function toggleMic() {
    setMicOn((v) => !v);
  }

  useEffect(() => {
    const track = localTrackRef.current;
    if (track) track.mute(!micOn);
  }, [micOn]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F6F7FB", display: "flex" }}>
      <div style={{ flex: 1, padding: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -0.4 }}>
              Звонок
            </div>
            <div style={{ color: "#667085", marginTop: 4, fontSize: 14 }}>
              Клиент: <b>{client}</b> · Комната: <b>{roomName}</b> · Identity:{" "}
              <b>{identity}</b>
            </div>

            <div style={{ marginTop: 10 }}>
              <StatusPill
                text={
                  error
                    ? `Ошибка: ${error}`
                    : connected
                    ? "Подключено"
                    : connecting
                    ? "Подключение…"
                    : "Готов к подключению"
                }
                tone={error ? "danger" : connected ? "ok" : connecting ? "warn" : "idle"}
              />
              <span style={{ marginLeft: 10, fontSize: 12, color: "#7A8198" }}>
                {lastEvent}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {!connected ? (
              <button
                onClick={connect}
                disabled={connecting}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: 14,
                  border: "1px solid #2E6BFF",
                  background: "#2E6BFF",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: connecting ? "not-allowed" : "pointer",
                  boxShadow: "0 10px 22px rgba(46,107,255,0.18)",
                }}
              >
                Подключиться
              </button>
            ) : (
              <button
                onClick={disconnect}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: 14,
                  border: "1px solid #F04438",
                  background: "#F04438",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 10px 22px rgba(240,68,56,0.18)",
                }}
              >
                Завершить
              </button>
            )}

            <button
              onClick={toggleMic}
              disabled={!connected}
              style={{
                height: 44,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid #ECEEF5",
                background: !connected ? "#F1F3F8" : "#fff",
                color: !connected ? "#98A2B3" : "#111827",
                fontWeight: 900,
                cursor: !connected ? "not-allowed" : "pointer",
              }}
            >
              Микрофон: {micOn ? "Вкл" : "Выкл"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Panel title="Сеанс">
            <div
              style={{
                border: "2px dashed #D9DDEB",
                borderRadius: 16,
                height: 360,
                background: "linear-gradient(180deg,#FAFBFF,#F3F5FF)",
                display: "grid",
                placeItems: "center",
                color: "#667085",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40 }}>🎧</div>
                <div style={{ marginTop: 10, fontWeight: 800 }}>
                  {connected
                    ? "Вы в комнате. Говорите — агент должен отвечать."
                    : "Подключитесь, чтобы начать звонок."}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                  }}
                >
                  <MiniStat label="DataChannel" value={dataChannelReady ? "OK" : "нет"} ok={dataChannelReady} />
                  <MiniStat label="Remote audio" value={remoteAudioPresent ? "есть" : "нет"} ok={remoteAudioPresent} />
                  <MiniStat label="Mic" value={micOn ? "вкл" : "выкл"} ok={micOn} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={() => pushTranscript("manager", "Тестовая реплика менеджера (UI)")}
                style={ghostBtn}
              >
                + Реплика (Вы)
              </button>
              <button
                onClick={() => pushTranscript("client", "Тестовая реплика клиента (UI)")}
                style={ghostBtn}
              >
                + Реплика (Клиент)
              </button>
              <button
                onClick={() => router.push("/trainer")}
                style={{ ...ghostBtn, marginLeft: "auto" }}
              >
                Назад
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#7A8198" }}>
              Для автотранскрибации агент должен слать data-сообщения JSON:
              <br />
              <code style={{ background: "#F6F7FB", padding: "2px 6px", borderRadius: 8 }}>
                {"{type:'transcript', role:'client'|'manager', text:'...', t:'12:34:56'}"}
              </code>
            </div>
          </Panel>

          <Panel title="Транскрибация">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {transcript.map((m) => (
                <Message key={m.id} role={m.role} text={m.text} t={m.t} />
              ))}
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: "#7A8198" }}>
              Следующий шаг: агент должен подключиться в эту же комнату и отправлять транскрипт через data channel.
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ECEEF5",
        borderRadius: 18,
        padding: 14,
        boxShadow: "0 14px 30px rgba(16,24,40,0.06)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function StatusPill({
  text,
  tone,
}: {
  text: string;
  tone: "ok" | "warn" | "danger" | "idle";
}) {
  const bg =
    tone === "ok"
      ? "#E9FBF0"
      : tone === "warn"
      ? "#FFF7E6"
      : tone === "danger"
      ? "#FFE8E8"
      : "#F1F3F8";
  const fg =
    tone === "ok"
      ? "#1A7F3E"
      : tone === "warn"
      ? "#B54708"
      : tone === "danger"
      ? "#B42318"
      : "#667085";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        border: "1px solid #ECEEF5",
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      ● {text}
    </span>
  );
}

function MiniStat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "7px 10px",
        background: ok ? "#EAF0FF" : "#F1F3F8",
        border: "1px solid #ECEEF5",
        fontSize: 12,
        fontWeight: 900,
        color: ok ? "#2E6BFF" : "#667085",
      }}
    >
      {label}: {value}
    </div>
  );
}

function Message({ role, text, t }: { role: Role; text: string; t?: string }) {
  const isClient = role === "client";
  const header = role === "client" ? "Клиент" : role === "manager" ? "Вы" : "Система";

  return (
    <div
      style={{
        maxWidth: "92%",
        alignSelf: isClient ? "flex-start" : "flex-end",
        background: isClient ? "#F1F3F8" : "#EAF0FF",
        border: "1px solid #ECEEF5",
        borderRadius: 14,
        padding: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 4,
          color: "#667085",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        <span>{header}</span>
        <span style={{ marginLeft: "auto", fontWeight: 700 }}>{t ?? ""}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{text}</div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  height: 40,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid #ECEEF5",
  background: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};