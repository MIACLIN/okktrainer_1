"use client";

import { useMemo, useState } from "react";

type NavKey = "training" | "calls" | "analytics";

function Icon({ name }: { name: NavKey }) {
  const common: React.CSSProperties = { width: 18, height: 18, display: "block" };

  // простые inline-svg, без внешних пакетов
  if (name === "training") {
    return (
      <svg viewBox="0 0 24 24" style={common} fill="none">
        <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    );
  }
  if (name === "calls") {
    return (
      <svg viewBox="0 0 24 24" style={common} fill="none">
        <path d="M6.5 10.2c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1.1-.3 1 .3 2 .4 3 .4.6 0 1 .4 1 1v3.3c0 .6-.4 1-1 1C10.7 19.8 4.2 13.3 4.2 5.5c0-.6.4-1 1-1H8.5c.6 0 1 .4 1 1 0 1 .1 2 .4 3 .1.4 0 .8-.3 1.1l-2.1 2.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" style={common} fill="none">
      <path d="M4 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M8 19v-7M12 19V9M16 19V6M20 19v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function Sidebar({
  onSidebarState,
}: {
  onSidebarState?: (isOpen: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NavKey>("training");

  const items = useMemo(
    () => [
      { key: "training" as const, label: "Тренировки" },
      { key: "calls" as const, label: "Звонки" },
      { key: "analytics" as const, label: "Аналитика" },
    ],
    []
  );

  function toggle() {
    setOpen((v) => {
      const next = !v;
      onSidebarState?.(next);
      return next;
    });
  }

  return (
    <>
      {/* backdrop for mobile drawer */}
      {open && <div className="drawerBackdrop" onClick={toggle} />}

      <aside className="sidebar" data-open={open ? "true" : "false"}>
        <div className="brandRow">
          <button className="iconBtn" onClick={toggle} aria-label="Toggle menu">
            {/* hamburger */}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="brandText">OKK</div>
        </div>

        <nav className="nav">
          {items.map((it) => (
            <button
              key={it.key}
              className="navItem"
              onClick={() => setActive(it.key)}
              style={{
                background: active === it.key ? "rgba(85, 109, 247, 0.14)" : undefined,
                borderColor: active === it.key ? "rgba(168, 85, 247, 0.24)" : undefined,
              }}
            >
              <span style={{ width: 42, display: "inline-flex", justifyContent: "center" }}>
                <Icon name={it.key} />
              </span>
              <span className="navLabel">{it.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebarFooter">
          <button className="iconBtn" title="Профиль">
            <span style={{ fontWeight: 800 }}>N</span>
          </button>
        </div>
      </aside>
    </>
  );
}
