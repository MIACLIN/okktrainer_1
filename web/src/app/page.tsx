"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Difficulty = "easy" | "medium" | "hard";
type Status = "not_started" | "done";

type Scenario = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  difficulty: Difficulty;
  status: Status;
  lastCompleted?: string; // "15.10.2025"
  score?: number; // 1..10
  cover?: string; // optional image url
  category: string; // grouping
};

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Простой",
  medium: "Средний",
  hard: "Сложный",
};

export default function TrainerPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = useMemo(
    () => [
      "Приветствие и установление контакта",
      "Выявление потребностей",
      "Программирование",
      "Осмотр",
      "Презентация",
      "Предзакрытие/согласование",
      "Закрытие",
      "Прощание",
    ],
    []
  );

  const scenarios: Scenario[] = useMemo(
    () => [
      {
        id: "primary_consult",
        title: 'Сценарий "Первичная консультация"',
        description:
          "Комплексная тренировка всех этапов первой встречи с клиентом.",
        tags: ["управление конфликтом", "стрессоустойчивость", "эмпатия"],
        difficulty: "easy",
        status: "not_started",
        category: "Рекомендованные",
        cover: "/images/ref/consult.jpg", // можно убрать
      },
      {
        id: "too_expensive",
        title: 'Отработка возражения "Это слишком дорого"',
        description:
          "Сценарий для тренировки работы с ценовыми возражениями.",
        tags: ["управление конфликтом", "стрессоустойчивость"],
        difficulty: "medium",
        status: "not_started",
        category: "Рекомендованные",
        cover: "/images/ref/expensive.jpg",
      },
      {
        id: "negative_review",
        title: "Работа с негативным отзывом",
        description:
          "Дескалация конфликта и перевод разговора в конструктив.",
        tags: ["эмпатия", "управление конфликтом"],
        difficulty: "hard",
        status: "done",
        lastCompleted: "15.10.2025",
        score: 9,
        category: "Рекомендованные",
        cover: "/images/ref/review.jpg",
      },

      // Шаблоны консультаций
      {
        id: "full_simple",
        title: "Полная консультация — Простой уровень",
        description:
          "Полный сценарий: от приветствия до завершения разговора.",
        tags: ["управление конфликтом", "стрессоустойчивость", "эмпатия"],
        difficulty: "easy",
        status: "done",
        lastCompleted: "15.10.2025",
        score: 1,
        category: "Шаблоны консультаций",
      },
      {
        id: "full_medium",
        title: "Полная консультация — Средний уровень",
        description:
          "Клиент сравнивает варианты, просит аргументы и цифры.",
        tags: ["стрессоустойчивость", "эмпатия"],
        difficulty: "medium",
        status: "not_started",
        category: "Шаблоны консультаций",
      },
      {
        id: "full_hard",
        title: "Полная консультация — Сложный уровень",
        description:
          "Скепсис, давление по цене, активные возражения и провокации.",
        tags: ["управление конфликтом", "стрессоустойчивость", "эмпатия"],
        difficulty: "hard",
        status: "done",
        lastCompleted: "15.10.2025",
        score: 9,
        category: "Шаблоны консультаций",
      },

      // Категории навыков (как внизу референса)
      {
        id: "contact_easy",
        title: "Установление контакта — базовый",
        description:
          "Тренировка первого впечатления: тон, структура, вопросы.",
        tags: ["эмпатия"],
        difficulty: "easy",
        status: "done",
        lastCompleted: "15.10.2025",
        score: 1,
        category: "Установление контакта и построение взаимоотношений",
      },
      {
        id: "needs_medium",
        title: "Диагностика потребностей — средний",
        description:
          "Выявление мотивации, критериев выбора и скрытых ограничений.",
        tags: ["стрессоустойчивость"],
        difficulty: "medium",
        status: "not_started",
        category: "Диагностика потребностей и формирование осознанности",
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scenarios.filter((s) => {
      const matchQ =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));

      const matchTag = !activeTag || activeTag === "Все" || s.title.includes(activeTag);
      // ⚠️ простой фильтр как заглушка: если захочешь — привяжем теги к сценариям нормально
      return matchQ && matchTag;
    });
  }, [scenarios, query, activeTag]);

  const grouped = useMemo(() => {
    const map = new Map<string, Scenario[]>();
    for (const s of filtered) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function startScenario(s: Scenario) {
    router.push(`/call?client=${s.difficulty}&scenario=${s.id}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F6F7FB" }}>
      {/* Top bar */}
      <header
        style={{
          height: 64,
          background: "#fff",
          borderBottom: "1px solid #ECEEF5",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 20, color: "#2E6BFF" }}>
          Auditorium
        </div>

        <nav style={{ display: "flex", gap: 14, marginLeft: 16, color: "#5C637A" }}>
          <a style={linkStyle} href="#">Для вас</a>
          <a style={linkStyle} href="#">Курсы</a>
          <a style={{ ...linkStyle, color: "#2E6BFF", fontWeight: 700 }} href="#">
            Тренажёр
          </a>
          <a style={linkStyle} href="#">Статьи</a>
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right", lineHeight: 1.1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Вавилов Георгий</div>
            <div style={{ fontSize: 12, color: "#7A8198" }}>Куратор</div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "#E8ECFF",
              border: "1px solid #DCE3FF",
            }}
          />
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 18px 60px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 12, color: "#7A8198", marginBottom: 10 }}>
          Обзор <span style={{ margin: "0 6px" }}>›</span>{" "}
          <span style={{ color: "#2E6BFF", fontWeight: 700 }}>Тренажёр</span>
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: "#fff",
            border: "1px solid #ECEEF5",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название тренажёра или навыка"
            style={{
              flex: 1,
              border: "1px solid #ECEEF5",
              borderRadius: 12,
              padding: "10px 12px",
              outline: "none",
              fontSize: 14,
              background: "#FAFBFF",
            }}
          />
          <button style={iconBtnStyle} title="Фильтры">⛭</button>
          <button style={iconBtnStyle} title="Сортировка">⇅</button>
        </div>

        {/* Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <Chip
            text="Все"
            active={!activeTag}
            onClick={() => setActiveTag(null)}
          />
          {tags.map((t) => (
            <Chip
              key={t}
              text={t}
              active={activeTag === t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            />
          ))}
        </div>

        {/* Groups */}
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 18 }}>
          {grouped.map(([groupName, items]) => (
            <section key={groupName}>
              <h2 style={{ margin: "6px 0 10px", fontSize: 16, fontWeight: 800 }}>
                {groupName}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((s) => (
                  <ScenarioCard key={s.id} scenario={s} onStart={() => startScenario(s)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function Chip({
  text,
  active,
  onClick,
}: {
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid #ECEEF5",
        background: active ? "#EAF0FF" : "#fff",
        color: active ? "#2E6BFF" : "#5C637A",
        borderRadius: 999,
        padding: "7px 10px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {text}
    </button>
  );
}

function ScenarioCard({
  scenario,
  onStart,
}: {
  scenario: any;
  onStart: () => void;
}) {
  const statusLabel = scenario.status === "done" ? "Пройдено" : "Не начато";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ECEEF5",
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gridTemplateColumns: scenario.cover ? "180px 1fr" : "1fr",
        gap: 14,
        alignItems: "stretch",
      }}
    >
      {scenario.cover ? (
        <div
          style={{
            borderRadius: 14,
            background: "#EEF2FF",
            border: "1px solid #E3E7FF",
            overflow: "hidden",
          }}
        >
          {/* если нет картинок — просто убери cover из данных */}
          <img
            src={scenario.cover}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>{scenario.title}</div>

          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              fontWeight: 800,
              padding: "6px 10px",
              borderRadius: 999,
              background: scenario.status === "done" ? "#E9FBF0" : "#F1F3F8",
              color: scenario.status === "done" ? "#1A7F3E" : "#6B7280",
              border: "1px solid #ECEEF5",
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div style={{ color: "#667085", fontSize: 13 }}>{scenario.description}</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {scenario.tags.map((t: string) => (
            <span
              key={t}
              style={{
                fontSize: 12,
                color: "#667085",
                background: "#F6F7FB",
                border: "1px solid #ECEEF5",
                borderRadius: 999,
                padding: "5px 9px",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#2E6BFF",
              background: "#EAF0FF",
              border: "1px solid #DCE3FF",
              borderRadius: 999,
              padding: "6px 10px",
            }}
          >
            {DIFF_LABEL[scenario.difficulty]}
          </span>

          {scenario.status === "done" ? (
            <div style={{ marginLeft: "auto", display: "flex", gap: 14, color: "#7A8198" }}>
              <span style={{ fontSize: 12 }}>
                Пройдено: <b style={{ color: "#111827" }}>{scenario.lastCompleted}</b>
              </span>
              <span style={{ fontSize: 12 }}>
                Оценка:{" "}
                <b
                  style={{
                    color: "#111827",
                    background: scoreBg(scenario.score),
                    borderRadius: 999,
                    padding: "4px 10px",
                    border: "1px solid #ECEEF5",
                  }}
                >
                  {scenario.score}/10
                </b>
              </span>
            </div>
          ) : (
            <div style={{ marginLeft: "auto" }} />
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button style={ghostBtnStyle}>Резюме</button>
          <button style={ghostBtnStyle}>Подробнее</button>
          <button style={primaryBtnStyle} onClick={onStart}>
            {scenario.status === "done" ? "Повторить" : "Начать"}
          </button>
        </div>

        <div style={{ marginTop: 6, fontSize: 12, color: "#7A8198" }}>
          Запуск ведёт на <code>/call?client={scenario.difficulty}&scenario={scenario.id}</code>
        </div>
      </div>
    </div>
  );
}

function scoreBg(score?: number) {
  if (!score) return "#F1F3F8";
  if (score >= 8) return "#E9FBF0";
  if (score >= 5) return "#FFF7E6";
  return "#FFE8E8";
}

const linkStyle: React.CSSProperties = {
  fontSize: 14,
  textDecoration: "none",
  color: "inherit",
};

const iconBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid #ECEEF5",
  background: "#fff",
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  marginLeft: "auto",
  border: "1px solid #2E6BFF",
  background: "#2E6BFF",
  color: "#fff",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  border: "1px solid #ECEEF5",
  background: "#fff",
  color: "#111827",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};