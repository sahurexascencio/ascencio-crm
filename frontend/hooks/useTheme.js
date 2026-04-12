"use client";
import { useState, useEffect } from "react";
import { getTheme, applyTheme, initTheme } from "@/lib/tokens";

export function useTheme() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    initTheme();
    setTheme(getTheme());
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    applyTheme(next);
    setTheme(next);
  };

  return { theme, toggle, isDark: theme === "dark" };
}
