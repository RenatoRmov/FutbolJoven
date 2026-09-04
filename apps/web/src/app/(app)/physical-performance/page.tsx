"use client";

import { FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api-client";
import { Category, Player } from "@/lib/types";

interface PhysicalRecord {
  id: string;
  date: string;
  metrics: Record<string, string | number>;
}

const METRIC_FIELDS = [
  ["sj", "SJ (cm)"],
  ["cmj", "CMJ (cm)"],
  ["ie", "IE (%)"],
  ["sprint10m", "10m (s)"],
  ["sprint20m", "20m (s)"],
  ["sprint30m", "30m (s)"],
  ["vift", "VIFT (km/h)"],
] as const;

const emptyForm = { date: new Date().toISOString().slice(0, 10), sj: "", cmj: "", ie: "", sprint10m: "", sprint20m: "", sprint30m: "", vift: "" };

export default function PhysicalPerformancePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [records, setRecords] = useState<PhysicalRecord[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories);
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setPlayers([]);
      setPlayerId("");
      return;
    }
    api.get<Player[]>(`/players?categoryId=${categoryId}`).then(setPlayers);
    setPlayerId("");
  }, [categoryId]);

  useEffect(() => {
    if (!playerId) {
      setRecords(null);
      return;
    }
    api.get<PhysicalRecord[]>(`/physical/player/${playerId}?recordType=PERFORMANCE`).then(setRecords);
  }, [playerId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!playerId) return;
    setError(null);
    setSaving(true);
    try {
      const metrics: Record<string, number> = {};
      for (const [key] of METRIC_FIELDS) {
        const value = form[key as keyof typeof form];
        if (value) metrics[key] = Number(value);
      }
      await api.post("/physical", { playerId, date: form.date, recordType: "PERFORMANCE", metrics });
      setForm({ ...emptyForm, date: form.date });
      api.get<PhysicalRecord[]>(`/physical/player/${playerId}?recordType=PERFORMANCE`).then(setRecords);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la medición");
    } finally {
      setSaving(false);
    }
  }

  const selectedPlayer = players.find((p) => p.id === playerId);

  return (
    <div>
      <Header title="Rendimiento Físico" />
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 py-4">
            <div>
              <Label>Categoría</Label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Jugador</Label>
              <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)} disabled={!categoryId}>
                <option value="">Seleccionar...</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </Select>
            </div>
            {selectedPlayer && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => api.download(`/reports/players/${playerId}/physical-performance-pdf`, `rendimiento-fisico-${selectedPlayer.firstName}-${selectedPlayer.lastName}.pdf`)}
              >
                Exportar PDF
              </Button>
            )}
          </CardContent>
        </Card>

        {playerId && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Nueva medición</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
                  <div>
                    <Label>Fecha</Label>
                    <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  {METRIC_FIELDS.map(([key, label]) => (
                    <div key={key}>
                      <Label>{label}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                  <div className="md:col-span-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Guardando..." : "Guardar medición"}
                    </Button>
                  </div>
                </form>
                {error && <p className="mt-2 text-sm text-rojo-oscuro">{error}</p>}
              </CardContent>
            </Card>

            {!records && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            )}

            {records && records.length === 0 && <EmptyState title="Sin mediciones registradas" />}

            {records && records.length > 0 && (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Fecha</Th>
                    {METRIC_FIELDS.map(([key, label]) => (
                      <Th key={key}>{label}</Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {records.map((r) => (
                    <Tr key={r.id}>
                      <Td>{new Date(r.date).toLocaleDateString("es-CL")}</Td>
                      {METRIC_FIELDS.map(([key]) => (
                        <Td key={key}>{r.metrics[key] ?? "—"}</Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
