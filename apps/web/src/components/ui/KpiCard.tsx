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
    neutral: "text-slate-50",
    success: "text-emerald-400",
    danger: "text-red-400",
    warning: "text-amber-400",
  } as const;

  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={cn("mt-1.5 text-2xl font-semibold", toneClasses[tone])}>{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}
