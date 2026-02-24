"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type ConnState = "idle" | "fetching_token" | "connecting" | "connected" | "error";
type TLine = { t: string; role: "you" | "client"; text: string };

type DataMsg =
  | { type: "transcript"; role?: "you" | "client"; text: string; t?: string }
  | { type: "status"; text: string }
  | { type: string; [k: string]: any };

export default function CallPage() {
  const sp = useSearchParams();
  const client = (sp.get("client") || "easy") as string;

  const roomName = useMemo(() => `okk-${client}`, [client]);
  const identity = useMemo(
    () => `manager-${Math.random().toString(16).slice(2, 8)}`,
    []
  );

  const [conn, setConn] = useState<ConnState>("idle");
  const [err, setErr] = useState<string | null>(null);

  const [lkRoom, setLkRoom] = useState<any>(null);
  const roomRef = useRef<any>(null);

  const [micEnabled, setMicEnabled] = useState(true);
  const [status, setStatus] = useState("Готов к подключению");
  const [transcript, setTranscript] = useState<TLine[]>([
    {
      t: new Date().toLocaleTimeString(),
      role: "client",
      text: "Привет. Расскажите, что вы предлагаете?",
    },
  ]);

  function addLine(role: "you" | "client", text: string, t?: string) {
    setTranscript((prev) => [
      ...prev,
      { t: t || new Date().toLocaleTimeString(), role, text },
    ]);
  }

  async function connect() {
    try {
      setErr(null);
      setConn("fetching_token");
      setStatus("Получаем токен...");

      // 1) token API (у тебя уже есть этот endpoint)
      const r = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: roomName,
          identity,
          name: "Manager",
        }),
      });

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(`Token API error: ${r.status}. ${text}`);
      }

      const data = (await r.json()) as { token: string; url: string };
      if (!data?.token || !data?.url) throw new Error("Invalid token response");

      setConn("connecting");
      setStatus("Подключаемся к комнате...");

      // 2) connect to LiveKit
      const lk = await import("livekit-client");
      const room = new lk.Room({ adaptiveStream: true, dynacast: true });

      // events
      room.on(lk.RoomEvent.Connected, () => {
        setConn("connected");
        setStatus(`Подключено: ${roomName}`);
      });

      room.on(lk.RoomEvent.Disconnected, () => {
        setConn("idle");
        setStatus("Отключено");
        setLkRoom(null);
        roomRef.current = null;
      });

      room.on(
        lk.RoomEvent.DataReceived,
        (payload: Uint8Array, _participant: any) => {
          // ожидаем JSON: {type:"transcript", text:"...", role:"client"|"you", t:"12:34:56"}
          try {
            const txt = new TextDecoder().decode(payload);
            const msg = JSON.parse(txt) as DataMsg;

            if (msg.type === "transcript" && typeof msg.text === "string") {
              addLine(msg.role || "client", msg.text, msg.t);
              return;
            }

            if (msg.type === "status" && typeof msg.text === "string") {
              setStatus(msg.text);
              return;
            }
          } catch {
            // ignore non-json
          }
        }
      );

      await room.connect(data.url, data.token);

      // сохранить
      roomRef.current = room;
      setLkRoom(room);

      // mic on by default
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicEnabled(true);

      // optional debug
      // eslint-disable-next-line no-console
      console.log("Connected:", room.name, room.sid);
    } catch (e: any) {
      setConn("error");
      setStatus("Ошибка подключения");
      setErr(e?.message || String(e));
    }
  }

  async function disconnect() {
    try {
      const r = roomRef.current || lkRoom;
      if (r) r.disconnect();
      roomRef.current = null;
      setLkRoom(null);
      setConn("idle");
      setStatus("Отключено");
    } catch {}
  }

  async function toggleMic() {
    try {
      const r = roomRef.current || lkRoom;
      if (!r) return;
      const next = !micEnabled;
      await r.localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    return () => {
      try {
        const r = roomRef.current || lkRoom;
        if (r) r.disconnect();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // кнопки-заглушки оставить для ручного теста UI
  function addDemoYou() {
    addLine("you", "Здравствуйте! Давайте уточню вашу задачу…");
  }
  function addDemoClient() {
    addLine("client", "Мне важно понять цену и чем вы лучше.");
  }

  return (
    <main style={{ padding: 26 }}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>Звонок</div>
          <div style={styles.hSub}>
            Клиент: <b>{client}</b> · Комната: <b>{roomName}</b> · Identity:{" "}
            <b>{identity}</b>
          </div>
        </div>

        <div style={styles.actions}>
          {conn !== "connected" ? (
            <button
              style={styles.primaryBtn}
              onClick={connect}
              disabled={conn === "fetching_token" || conn === "connecting"}
            >
              {conn === "fetching_token"
                ? "Токен..."
                : conn === "connecting"
                ? "Подключение..."
                : "Подключиться"}
            </button>
          ) : (
            <button style={styles.dangerBtn} onClick={disconnect}>
              Завершить
            </button>
          )}

          <button
            style={{
              ...styles.secondaryBtn,
              opacity: conn === "connected" ? 1 : 0.5,
              cursor: conn === "connected" ? "pointer" : "not-allowed",
            }}
            onClick={toggleMic}
            disabled={conn !== "connected"}
          >
            {micEnabled ? "Микрофон: Вкл" : "Микрофон: Выкл"}
          </button>
        </div>
      </div>

      <div style={styles.statusRow}>
        <span style={styles.pill}>{status}</span>
        {err && <span style={styles.errPill}>{err}</span>}
      </div>

      <div style={styles.grid}>
        <section style={styles.panel}>
          <div style={styles.panelTitle}>Сеанс</div>

          <div style={styles.callStage}>
            <div style={styles.avatarBig}>🎧</div>
            <div style={styles.stageText}>
              {conn === "connected"
                ? "Вы в комнате. Говорите — агент должен отвечать."
                : "Подключитесь, чтобы начать звонок."}
            </div>
          </div>

          <div style={styles.miniRow}>
            <button style={styles.miniBtn} onClick={addDemoYou}>
              + Реплика (Вы)
            </button>
            <button style={styles.miniBtn} onClick={addDemoClient}>
              + Реплика (Клиент)
            </button>
          </div>

          <div style={styles.smallHint}>
            Для автотранскрибации агент должен слать data-сообщения в формате JSON:{" "}
            <code style={styles.code}>
              {"{type:'transcript', role:'client', text:'...', t:'12:34:56'}"}
            </code>
          </div>
        </section>

        <section style={styles.panel}>
          <div style={styles.panelTitle}>Транскрибация</div>

          <div style={styles.transcript}>
            {transcript.map((m, i) => (
              <div
                key={i}
                style={{
                  ...styles.msg,
                  alignItems: m.role === "you" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.bubble,
                    background:
                      m.role === "you"
                        ? "rgba(37, 99, 235, 0.12)"
                        : "rgba(15, 23, 42, 0.06)",
                    borderColor:
                      m.role === "you"
                        ? "rgba(37, 99, 235, 0.25)"
                        : "rgba(15, 23, 42, 0.10)",
                  }}
                >
                  <div style={styles.meta}>
                    <span style={{ fontWeight: 700 }}>
                      {m.role === "you" ? "Вы" : "Клиент"}
                    </span>
                    <span style={{ opacity: 0.6 }}>{m.t}</span>
                  </div>
                  <div style={styles.text}>{m.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.hint}>
            Следующий шаг: запустить агента, который подключится в эту же комнату
            и будет слать транскрипт через data channel.
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  hTitle: { fontSize: 26, fontWeight: 800, letterSpacing: -0.3 },
  hSub: { color: "rgba(15,23,42,0.65)", fontSize: 13, marginTop: 4 },
  actions: { display: "flex", gap: 10, alignItems: "center" },
  statusRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 },
  pill: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(10px)",
    fontSize: 12,
    color: "rgba(15,23,42,0.75)",
  },
  errPill: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.08)",
    fontSize: 12,
    color: "rgba(127,29,29,0.95)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
    gap: 16,
  },
  panel: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 18,
    boxShadow: "0 10px 25px rgba(2,6,23,0.07)",
    backdropFilter: "blur(10px)",
    padding: 16,
    minHeight: 520,
  },
  panelTitle: { fontWeight: 800, marginBottom: 12 },
  callStage: {
    borderRadius: 16,
    border: "1px dashed rgba(15,23,42,0.16)",
    background:
      "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(255,255,255,0.30))",
    height: 360,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 10,
    padding: 16,
  },
  avatarBig: { fontSize: 56 },
  stageText: {
    color: "rgba(15,23,42,0.65)",
    textAlign: "center",
    maxWidth: 420,
  },
  transcript: {
    height: 420,
    overflow: "auto",
    padding: 6,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  msg: { display: "flex" },
  bubble: {
    maxWidth: "88%",
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,0.10)",
    padding: "10px 12px",
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 11,
    marginBottom: 6,
    color: "rgba(15,23,42,0.72)",
  },
  text: { fontSize: 14, lineHeight: 1.35, color: "rgba(15,23,42,0.92)" },
  hint: {
    marginTop: 10,
    fontSize: 12,
    color: "rgba(15,23,42,0.55)",
  },
  primaryBtn: {
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 800,
    color: "#fff",
    background: "#2563eb",
    boxShadow: "0 12px 28px rgba(37,99,235,0.30)",
    cursor: "pointer",
  },
  secondaryBtn: {
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 800,
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(15,23,42,0.12)",
    cursor: "pointer",
  },
  dangerBtn: {
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 800,
    color: "#fff",
    background: "rgba(239,68,68,0.95)",
    boxShadow: "0 10px 22px rgba(239,68,68,0.22)",
    cursor: "pointer",
  },
  miniRow: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  miniBtn: {
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 700,
    background: "rgba(15,23,42,0.04)",
    border: "1px solid rgba(15,23,42,0.10)",
    cursor: "pointer",
  },
  smallHint: { marginTop: 12, fontSize: 12, color: "rgba(15,23,42,0.62)" },
  code: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 10,
    background: "rgba(15,23,42,0.06)",
    border: "1px solid rgba(15,23,42,0.10)",
  },
};