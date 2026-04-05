"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";
interface Toast { id: number; type: ToastType; message: string }

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let seq = 0;

  const remove = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++seq;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right-5 duration-300 ${
              t.type === "success"
                ? "bg-white border-green-200 text-green-800"
                : "bg-white border-red-200 text-red-800"
            }`}
          >
            {t.type === "success"
              ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
            <span>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="ml-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
