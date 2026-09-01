import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "info" | "warning" | "orange" | "danger";

// Exact palette from the club's status pills (proyectado/proyectable/en
// desarrollo/limitado/no apto, and the medical apto/en proceso/no apto dots).
const toneClasses: Record<Tone, string> = {
  neutral: "bg-gris-claro text-gris",
  success: "bg-[#E4F5E9] text-[#1E7A3E]",
  info: "bg-[#EAF2FE] text-[#1D5FB3]",
  warning: "bg-[#FFF4DA] text-[#9A6B00]",
  orange: "bg-[#FDE9DD] text-[#B4531A]",
  danger: "bg-[#FBE1E4] text-rojo-oscuro",
};

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", toneClasses[tone], className)}
      {...props}
    />
  );
}
