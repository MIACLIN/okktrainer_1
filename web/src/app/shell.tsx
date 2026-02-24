"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="appShell">
      <Sidebar onSidebarState={setOpen} />
      <div className="mainWrap" data-sidebar={open ? "open" : "closed"}>
        {children}
      </div>
    </div>
  );
}