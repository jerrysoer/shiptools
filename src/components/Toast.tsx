"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

type ToastType = "success" | "error";

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-8 right-8 z-[200] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto bg-bg-elevated border-l-4 px-4 py-3 shadow-lg max-w-sm ${
              t.type === "error" ? "border-grade-f" : "border-accent"
            } ${prefersReducedMotion.current ? "" : "fade-in"}`}
          >
            <p className="font-mono text-[10px] tracking-widest uppercase text-text-tertiary mb-1">
              {t.type === "error" ? "Error" : "Done"}
            </p>
            <p className="text-sm text-text-primary">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
