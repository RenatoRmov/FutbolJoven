"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api-client";
import { Category } from "@/lib/types";

interface MedicalStatusRow {
  id: string;
  firstName: string;
  lastName: string;
  categoryId: string | null;
  categoryName: string;
  aptitud: "APTO" | "EN_REINTEGRO" | "NO_APTO";
  lastInjury: { description: string; date: string; status: string } | null;
}

const APTITUD_LABELS: Record<MedicalStatusRow["aptitud"], string> = {
  APTO: "Apto",
  EN_REINTEGRO: "En reintegro",
  NO_APTO: "No apto",
};

const APTITUD_TONE: Record<MedicalStatusRow["aptitud"], "success" | "warning" | "danger"> = {
  APTO: "success",
  EN_REINTEGRO: "warning",
  NO_APTO: "danger",
};

export default function MedicalPage() {
  const [rows, setRows] = useState<MedicalStatusRow[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  useEffect(() => {
    api.get<MedicalStatusRow[]>("/physical/medical-status").then(setRows);
    api.get<Category[]>("/categories").then(setCategories);
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (!categoryFilter) return rows;
    return rows.filter((r) => r.categoryId === categoryFilter);
  }, [rows, categoryFilter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (a.aptitud === b.aptitud ? 0 : a.aptitud === "APTO" ? 1 : b.aptitud === "APTO" ? -1 : 0)),
    [filtered],
  );

  return (
    <div>
      <Header title="Médica" />
      <div className="space-y-4 p-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoryFilter("")}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-bold",
              categoryFilter === "" ? "border-carbon bg-carbon text-white" : "border-borde bg-white text-gris",
            )}
          >
            Todas
          </button>
          {categories
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-bold",
                  categoryFilter === c.id ? "border-carbon bg-carbon text-white" : "border-borde bg-white text-gris",
                )}
              >
                {c.name}
              </button>
            ))}
        </div>

        {!rows && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        )}

        {rows && sorted.length === 0 && <EmptyState title="No hay jugadores en esta categoría" />}

        {rows && sorted.length > 0 && (
          <Card>
            <CardContent className="divide-y divide-borde py-0">
              {sorted.map((r) => (
                <Link
                  key={r.id}
                  href={`/players/${r.id}`}
                  className="flex items-center justify-between gap-3 py-3.5 hover:bg-gris-claro/60"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        r.aptitud === "APTO" ? "bg-[#1E7A3E]" : r.aptitud === "EN_REINTEGRO" ? "bg-[#C68A00]" : "bg-rojo-oscuro",
                      )}
                    />
                    <div>
                      <p className="text-sm font-bold text-carbon">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="text-xs text-gris">
                        {r.categoryName}
                        {r.lastInjury && ` · ${r.lastInjury.description}`}
                      </p>
                    </div>
                  </div>
                  <Badge tone={APTITUD_TONE[r.aptitud]}>{APTITUD_LABELS[r.aptitud]}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
