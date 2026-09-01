import { Card, CardContent } from "./Card";
import { cn } from "@/lib/cn";

export function KpiCard({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "danger" | "warning";
  hint?: string;
}) {
  const toneClasses = {
    neutral: "text-rojo",
    success: "text-[#1E7A3E]",
    danger: "text-rojo-oscuro",
    warning: "text-[#9A6B00]",
  } as const;

  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className={cn("font-display text-3xl tracking-wide", toneClasses[tone])}>{value}</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gris">{label}</p>
        {hint && <p className="mt-1 text-xs text-gris">{hint}</p>}
      </CardContent>
    </Card>
  );
}
