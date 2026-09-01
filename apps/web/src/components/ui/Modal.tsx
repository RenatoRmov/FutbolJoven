"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  children,
  widthClass = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn("max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-club sm:rounded-2xl", widthClass)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gris-claro text-xs font-bold text-gris hover:bg-borde"
      title="¿Qué significa cada dato?"
    >
      ?
    </button>
  );
}
