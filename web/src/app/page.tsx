"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ClientId = "easy" | "medium" | "hard";

export default function Page() {
  const router = useRouter(); // ✅ внутри компонента
  const [selected, setSelected] = useState<ClientId | null>(null);

  const clients = useMemo(
    () => [
      {
        id: "easy" as const,
        title: "Базовый клиент",
        description: "Дружелюбный, открыт к диалогу, умеренные возражения.",
      },
      {
        id: "medium" as const,
        title: "Рациональный клиент",
        description: "Сравнивает предложения, требует чёткую аргументацию.",
      },
      {
        id: "hard" as const,
        title: "Сложный клиент",
        description: "Скептичен, давит по цене, активно возражает.",
      },
    ],
    []
  );

  return (
    <main className="centerHero">
      <div className="heroContainer">
        <h1 className="hTitle">OKK Trainer</h1>
        <p className="hSub">Голосовой тренажёр переговоров для отдела продаж</p>

        <div className="cards">
          {clients.map((c) => {
            const isSelected = selected === c.id;
            return (
              <div
                key={c.id}
                className={`card ${isSelected ? "cardSelected" : ""}`}
                onClick={() => setSelected(c.id)}
                role="button"
                tabIndex={0}
              >
                <h3 className="cardTitle">{c.title}</h3>
                <p className="cardText">{c.description}</p>
              </div>
            );
          })}
        </div>

        <div className="ctaRow">
          <button
            className="primaryBtn"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              router.push(`/call?client=${selected}`);
            }}
          >
            Начать тренировку
          </button>
        </div>
      </div>
    </main>
  );
}