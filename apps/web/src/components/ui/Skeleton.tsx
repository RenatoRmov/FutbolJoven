import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-borde/70", className)} />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-borde py-12 text-center">
      <span className="mb-2 block text-3xl">⚽</span>
      <p className="font-display text-lg tracking-wide text-carbon">{title}</p>
      {description && <p className="mt-1 text-xs text-gris">{description}</p>}
    </div>
  );
}
