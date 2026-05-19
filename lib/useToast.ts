import { useState, useCallback } from "react";
import type { ToastItem } from "@/components/shared/ui";

let _counter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastItem["type"] = "i") => {
    const id = String(++_counter);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return { toasts, toast };
}
