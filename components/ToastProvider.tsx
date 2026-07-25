"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastTone = "amber" | "red";
type ToastPayload = { label: string; message: string; tone?: ToastTone };
type ToastState = ToastPayload & { id: number };

const ToastContext = createContext<(t: ToastPayload) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const idRef = useRef(0);

  const showToast = useCallback((payload: ToastPayload) => {
    idRef.current += 1;
    setToast({ ...payload, id: idRef.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] z-[60] flex justify-center px-4 lg:bottom-8"
        >
          <div
            className={`ticket-stub flex animate-ticket-in items-center gap-3 border-l-4 bg-card py-2.5 pl-4 pr-5 shadow-lg shadow-black/40 ${
              toast.tone === "red" ? "border-red-500" : "border-accent"
            }`}
          >
            <span
              className={`font-display text-base tracking-wide ${
                toast.tone === "red" ? "text-red-400" : "text-accent"
              }`}
            >
              {toast.label}
            </span>
            <span className="max-w-[14rem] truncate text-sm text-white/70">{toast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
