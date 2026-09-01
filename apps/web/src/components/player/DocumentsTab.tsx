"use client";

import { useEffect, useState } from "react";
import { DOCUMENT_CATEGORY_LABELS, PERMISSIONS } from "@futboljoven/shared";
import type { DocumentCategory } from "@futboljoven/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface DocumentRow {
  documentType: { id: string; key: string; name: string; category: DocumentCategory; isRequired: boolean };
  document: { id: string; status: string; submittedDate: string | null; notes: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  SUBMITTED: "Entregado",
  EXPIRED: "Vencido",
  NOT_APPLICABLE: "No aplica",
};
const STATUS_TONE: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  PENDING: "warning",
  SUBMITTED: "success",
  EXPIRED: "danger",
  NOT_APPLICABLE: "neutral",
};

export function DocumentsTab({ playerId }: { playerId: string }) {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<DocumentRow[] | null>(null);
  const canManage = hasPermission(PERMISSIONS.PLAYERS_DOCUMENTS_MANAGE);

  function load() {
    api.get<DocumentRow[]>(`/players/${playerId}/documents`).then(setRows);
  }

  useEffect(load, [playerId]);

  async function updateStatus(documentTypeId: string, status: string) {
    await api.put(`/players/${playerId}/documents`, { documentTypeId, status });
    load();
  }

  if (!rows) return <Skeleton className="h-48" />;

  const byCategory = new Map<DocumentCategory, DocumentRow[]>();
  for (const row of rows) {
    const arr = byCategory.get(row.documentType.category) ?? [];
    arr.push(row);
    byCategory.set(row.documentType.category, arr);
  }

  return (
    <div className="space-y-4">
      {Array.from(byCategory.entries()).map(([category, categoryRows]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{DOCUMENT_CATEGORY_LABELS[category]}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-borde py-0">
            {categoryRows.map((row) => {
              const status = row.document?.status ?? "PENDING";
              return (
                <div key={row.documentType.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm text-carbon">
                      {row.documentType.name}
                      {!row.documentType.isRequired && <span className="ml-2 text-xs text-gris">(opcional)</span>}
                    </p>
                    {row.document?.submittedDate && (
                      <p className="text-xs text-gris">Entregado el {new Date(row.document.submittedDate).toLocaleDateString("es-AR")}</p>
                    )}
                  </div>
                  {canManage ? (
                    <Select className="w-40" value={status} onChange={(e) => updateStatus(row.documentType.id, e.target.value)}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
