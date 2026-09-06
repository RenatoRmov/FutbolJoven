"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/date";

interface PhysicalRecord {
  id: string;
  date: string;
  metrics: Record<string, string | number>;
  observations: string | null;
  recordedBy: { firstName: string; lastName: string };
}

interface Injury {
  id: string;
  description: string;
  bodyPart: string | null;
  date: string;
  severity: string | null;
  status: string;
  expectedRecoveryDays: number | null;
  painLevel: number | null;
  mobilityNotes: string | null;
}

const INJURY_STATUS_TONE: Record<string, "danger" | "warning" | "success"> = {
  ACTIVE: "danger",
  RECOVERING: "warning",
  CLEARED: "success",
};
const INJURY_STATUS_LABELS: Record<string, string> = { ACTIVE: "Activa", RECOVERING: "En recuperación", CLEARED: "De alta" };

export function PhysicalHealthTab({ playerId }: { playerId: string }) {
  const [records, setRecords] = useState<PhysicalRecord[] | null>(null);
  const [injuries, setInjuries] = useState<Injury[] | null>(null);

  useEffect(() => {
    api.get<PhysicalRecord[]>(`/physical/player/${playerId}?recordType=PERFORMANCE`).then(setRecords);
    api.get<Injury[]>(`/injuries/player/${playerId}`).then(setInjuries);
  }, [playerId]);

  if (!records || !injuries) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Historial de lesiones</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-borde py-0">
          {injuries.length === 0 ? (
            <EmptyState title="Sin lesiones registradas" />
          ) : (
            injuries.map((inj) => (
              <div key={inj.id} className="py-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-carbon">
                    {inj.description} {inj.bodyPart && `— ${inj.bodyPart}`}
                  </span>
                  <Badge tone={INJURY_STATUS_TONE[inj.status] ?? "neutral"}>{INJURY_STATUS_LABELS[inj.status] ?? inj.status}</Badge>
                </div>
                <p className="text-xs text-gris">
                  {formatDate(inj.date, "es-AR")}
                  {inj.expectedRecoveryDays !== null && ` · Recuperación estimada: ${inj.expectedRecoveryDays} días`}
                  {inj.painLevel !== null && ` · Dolor: ${inj.painLevel}/10`}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Baterías físicas</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-borde py-0">
          {records.length === 0 ? (
            <EmptyState title="Sin baterías físicas registradas" />
          ) : (
            records.map((r) => (
              <div key={r.id} className="py-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-carbon">{formatDate(r.date, "es-AR")}</span>
                  <span className="text-xs text-gris">
                    {r.recordedBy.firstName} {r.recordedBy.lastName}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(r.metrics).map(([k, v]) => (
                    <Badge key={k} tone="neutral" className="capitalize">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
