"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";

const eventName = "hisab-theme";

function readTheme(): Theme {
  const stored = window.localStorage.getItem("hisab.theme");
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(eventName, onStoreChange);
  return () => window.removeEventListener(eventName, onStoreChange);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    if (theme !== "system") document.documentElement.classList.add(theme);
  }, [theme]);

  function cycle() {
    const order: Theme[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length] ?? "system";
    window.localStorage.setItem("hisab.theme", next);
    window.dispatchEvent(new Event(eventName));
  }

  const label = theme === "dark" ? "Theme: dark" : theme === "light" ? "Theme: light" : "Theme: auto";
  return (
    <button type="button" onClick={cycle} className="rounded-full border border-line px-3 py-2 text-sm">
      {label}
    </button>
  );
}
