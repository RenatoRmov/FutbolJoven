"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string } | null;
}

const ACTION_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  CREATE: "success",
  CREATE_BATCH: "success",
  UPDATE: "info",
  UPDATE_PERMISSIONS: "info",
  DELETE: "danger",
  DEACTIVATE: "warning",
};

function summarizeChange(entry: AuditEntry): string {
  if (!entry.oldValue || !entry.newValue) return "";
  const changed: string[] = [];
  for (const key of Object.keys(entry.newValue)) {
    if (["updatedAt", "createdAt"].includes(key)) continue;
    const oldV = (entry.oldValue as Record<string, unknown>)[key];
    const newV = (entry.newValue as Record<string, unknown>)[key];
    if (JSON.stringify(oldV) !== JSON.stringify(newV) && typeof newV !== "object") {
      changed.push(`${key}: ${String(oldV)} → ${String(newV)}`);
    }
  }
  return changed.slice(0, 3).join(" · ");
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    api.get<{ items: AuditEntry[]; total: number }>("/audit").then((res) => setEntries(res.items));
  }, []);

  return (
    <div>
      <Header title="Auditoría" />
      <div className="p-6">
        {!entries && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}

        {entries && entries.length === 0 && <EmptyState title="Todavía no hay registros de auditoría" />}

        {entries && entries.length > 0 && (
          <Table>
            <Thead>
              <Tr>
                <Th>Fecha</Th>
                <Th>Usuario</Th>
                <Th>Acción</Th>
                <Th>Entidad</Th>
                <Th>Cambios</Th>
              </Tr>
            </Thead>
            <Tbody>
              {entries.map((e) => (
                <Tr key={e.id}>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    {new Date(e.createdAt).toLocaleString("es-AR")}
                  </Td>
                  <Td>{e.user ? `${e.user.firstName} ${e.user.lastName}` : "Sistema"}</Td>
                  <Td>
                    <Badge tone={ACTION_TONE[e.action] ?? "neutral"}>{e.action}</Badge>
                  </Td>
                  <Td>{e.entityType}</Td>
                  <Td className="max-w-md truncate text-xs text-slate-400">{summarizeChange(e)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
