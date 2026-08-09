"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api-client";
import { Player, Team } from "@/lib/types";
import { EVALUATION_TYPES } from "@futboljoven/shared";

interface Dimension {
  id: string;
  key: string;
  name: string;
  order: number;
  scale: { minValue: number; maxValue: number };
}

export default function QuickEvaluationPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const teamId = params.teamId;

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<string>("MATCH");
  const [context, setContext] = useState("");
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([
      api.get<Team>(`/teams/${teamId}`),
      api.get<Player[]>(`/players?teamId=${teamId}`),
      api.get<{ dimensions: Dimension[] }>("/evaluations/config"),
    ]).then(([t, p, cfg]) => {
      setTeam(t);
      setPlayers(p);
      setDimensions(cfg.dimensions);
    });
  }, [teamId]);

  const midValue = useMemo(() => {
    if (dimensions.length === 0) return 6;
    return Math.round((dimensions[0].scale.minValue + dimensions[0].scale.maxValue) / 2);
  }, [dimensions]);

  function setScore(playerId: string, dimensionId: string, value: number) {
    setScores((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [dimensionId]: value } }));
  }

  async function handleSubmit() {
    if (!players) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const entries = players.map((p) => {
        const playerScores = scores[p.id] ?? {};
        return {
          playerId: p.id,
          observation: observations[p.id] || null,
          scores: dimensions.map((d) => ({ dimensionId: d.id, value: playerScores[d.id] ?? midValue })),
        };
      });

      await api.post("/evaluations/quick", { teamId, date, type, context: context || null, entries });
      setSuccess(`Se guardaron ${entries.length} evaluaciones.`);
      setScores({});
      setObservations({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la evaluación");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Header title={team ? `Evaluación rápida — ${team.name}` : "Evaluación rápida"} />
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/evaluations")}>
          ← Volver a categorías
        </Button>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-4 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Fecha</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Tipo</label>
              <Select value={type} onChange={(e) => setType(e.target.value)} className="w-44">
                {EVALUATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs font-medium text-slate-400">Contexto (opcional)</label>
              <Input placeholder="vs. Rival FC" value={context} onChange={(e) => setContext(e.target.value)} />
            </div>
            <Button onClick={handleSubmit} disabled={saving || !players || players.length === 0}>
              {saving ? "Guardando..." : "Guardar evaluaciones"}
            </Button>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">{success}</p>}

        {!players && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}

        {players && players.length === 0 && <EmptyState title="Este equipo no tiene jugadores cargados" />}

        {players && players.length > 0 && (
          <Table>
            <Thead>
              <Tr>
                <Th className="sticky left-0 bg-pitch-800">Jugador</Th>
                {dimensions.map((d) => (
                  <Th key={d.id}>{d.name}</Th>
                ))}
                <Th>Observación</Th>
              </Tr>
            </Thead>
            <Tbody>
              {players.map((p) => (
                <Tr key={p.id}>
                  <Td className="sticky left-0 whitespace-nowrap bg-pitch-900 font-medium text-slate-100">
                    {p.firstName} {p.lastName}
                  </Td>
                  {dimensions.map((d) => (
                    <Td key={d.id}>
                      <Select
                        className="w-20"
                        value={scores[p.id]?.[d.id] ?? midValue}
                        onChange={(e) => setScore(p.id, d.id, Number(e.target.value))}
                      >
                        {Array.from({ length: d.scale.maxValue - d.scale.minValue + 1 }, (_, i) => d.scale.minValue + i).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </Td>
                  ))}
                  <Td>
                    <Input
                      placeholder="Opcional"
                      className="w-48"
                      value={observations[p.id] ?? ""}
                      onChange={(e) => setObservations((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
