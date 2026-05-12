"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

type Props = {
  message: string;
  onDone: () => void;
  durationMs?: number;
};

export default function Toast({ message, onDone, durationMs = 1500 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
  }, [onDone, durationMs]);

  return (
    <div
      role="status"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-pos px-4 py-2 text-sm font-medium text-white shadow-lg animate-toast"
    >
      <Check size={16} />
      <span>{message}</span>
    </div>
  );
}
