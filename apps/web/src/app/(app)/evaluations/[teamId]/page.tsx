"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { Modal, HelpButton } from "@/components/ui/Modal";
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

interface Match {
  id: string;
  opponent: string;
  date: string;
  isHome: boolean;
  status: string;
  appearances?: { playerId: string; started: boolean }[];
}

const METRIC_GLOSSARY: { title: string; metrics: string[] }[] = [
  {
    title: "1. Dimensión Táctica",
    metrics: [
      "Lectura y Posicionamiento",
      "Toma de Decisiones bajo Presión",
      "Transición Ataque - Defensa",
      "Transición Defensa - Ataque",
      "Vigilancias Defensivas y Coberturas",
      "Interpretación de la Ventaja",
      "Acciones a Balón Parado (ABP)",
    ],
  },
  {
    title: "2. Dimensión Técnica",
    metrics: [
      "Control Orientativo y Perfilamiento",
      "Pase Corto y Medio",
      "Pase Largo y Cambio de Orientación",
      "Duelo Individual 1vs1 (Regate / Desborde)",
      "Remate y Finalización",
      "Juego Aéreo",
      "Conducción y Fijación",
    ],
  },
  {
    title: "3. Dimensión Física",
    metrics: [
      "Capacidad Aeróbica y Resistencia a la Fatiga",
      "Velocidad de Aceleración y Arranque (0-15m)",
      "Repetición de Sprints (RSA)",
      "Fuerza Utilitaria y Duelo Corporal",
      "Agilidad y Cambios de Dirección (CODA)",
      "Potencia de Salto (Pliometría)",
      "Flexibilidad, Movilidad y Profilaxis",
    ],
  },
  {
    title: "4. Dimensión Mental y Actitudinal",
    metrics: [
      "Resiliencia y Frustración",
      "Atención y Concentración Sostenida",
      "Liderazgo y Comunicación Asertiva",
      "Inteligencia Emocional y Autocontrol",
      "Cultura de Sacrificio y Esfuerzo",
      "Asimilación e Inteligencia Táctica Viva",
      "Confianza y Determinación",
    ],
  },
];

/** Minutes played -> 0-10 equivalent so it blends into the weighted Nota Final like every other dimension. 90+ min = 10. */
function minutesToScore(minutes: number): number {
  return Math.max(0, Math.min(10, minutes / 9));
}

/** Training days in the month -> 0-10 equivalent, same idea as minutesToScore. 20+ días = 10. */
function daysToScore(days: number): number {
  return Math.max(0, Math.min(10, days / 2));
}

// El punteo del club solo distingue Partido/Entrenamiento en la carga rápida
// ("Período" sigue existiendo en el enum compartido para no romper el label
// de evaluaciones históricas que ya lo usan, pero no se ofrece acá).
const QUICK_EVAL_TYPES = EVALUATION_TYPES.filter((t) => t.value === "MATCH" || t.value === "TRAINING");

export default function QuickEvaluationPage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const teamId = params.teamId;

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<string>("MATCH");
  const [context, setContext] = useState(""); // Match.id seleccionado, o "" (sin partido asociado)
  const [contextMatch, setContextMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([
      api.get<Team>(`/teams/${teamId}`),
      api.get<Player[]>(`/players?teamId=${teamId}`),
      api.get<{ dimensions: Dimension[] }>("/evaluations/config"),
      api.get<Match[]>(`/fixtures/team/${teamId}`).catch(() => []),
    ]).then(([t, p, cfg, m]) => {
      setTeam(t);
      setPlayers(p);
      setDimensions(cfg.dimensions);
      setMatches(m);
    });
  }, [teamId]);

  useEffect(() => {
    if (type !== "MATCH" || !context) {
      setContextMatch(null);
      return;
    }
    api.get<Match>(`/fixtures/${context}`).then(setContextMatch);
  }, [type, context]);

  // Cuando hay un partido de Contexto seleccionado Y ya tiene resultado
  // cargado, solo se puede evaluar a los jugadores citados a ese partido
  // (los demás no jugaron). Si el partido todavía no se jugó (sin citados
  // cargados todavía), no bloqueamos la carga — se muestra el plantel
  // completo, igual que sin Contexto.
  const citadoIds = useMemo(() => {
    if (type !== "MATCH" || !context || !contextMatch || contextMatch.status !== "PLAYED") return null;
    return new Set(contextMatch.appearances?.filter((a) => a.started).map((a) => a.playerId) ?? []);
  }, [type, context, contextMatch]);

  const evaluablePlayers = useMemo(() => {
    if (!players) return players;
    if (!citadoIds) return players;
    return players.filter((p) => citadoIds.has(p.id));
  }, [players, citadoIds]);

  const midValue = useMemo(() => {
    if (dimensions.length === 0) return 6;
    return Math.round((dimensions[0].scale.minValue + dimensions[0].scale.maxValue) / 2);
  }, [dimensions]);

  function setScore(playerId: string, dimensionId: string, value: number) {
    setScores((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [dimensionId]: value } }));
  }

  async function handleSubmit() {
    if (!evaluablePlayers) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const contextLabel = context ? matches.find((m) => m.id === context) : null;
      const entries = evaluablePlayers.map((p) => {
        const playerScores = scores[p.id] ?? {};
        return {
          playerId: p.id,
          observation: observations[p.id] || null,
          scores: dimensions.map((d) => {
            const raw = playerScores[d.id];
            const value = d.key !== "performance" ? raw ?? midValue : type === "TRAINING" ? daysToScore(raw ?? 0) : minutesToScore(raw ?? 0);
            return { dimensionId: d.id, value };
          }),
        };
      });

      await api.post("/evaluations/quick", {
        teamId,
        date,
        type,
        context: contextLabel ? `${new Date(contextLabel.date).toLocaleDateString("es-CL")} ${contextLabel.isHome ? "vs" : "@"} ${contextLabel.opponent}` : null,
        entries,
      });
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
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/evaluations")}>
            ← Volver a categorías
          </Button>
          <div className="flex items-center gap-2 text-sm text-gris">
            <span>¿Qué evalúa cada dimensión?</span>
            <HelpButton onClick={() => setGlossaryOpen(true)} />
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-end gap-4 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gris">Fecha</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gris">Tipo</label>
              <Select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  if (e.target.value !== "MATCH") setContext("");
                }}
                className="w-44"
              >
                {QUICK_EVAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            {type === "MATCH" && (
              <div className="flex-1 min-w-[220px]">
                <label className="mb-1 block text-xs font-medium text-gris">Contexto (partido del fixture)</label>
                <Select value={context} onChange={(e) => setContext(e.target.value)}>
                  <option value="">Sin partido asociado</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {new Date(m.date).toLocaleDateString("es-CL")} {m.isHome ? "vs" : "@"} {m.opponent}
                      {m.status === "SCHEDULED" ? " (programado)" : m.status === "PLAYED" ? " (jugado)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <Button onClick={handleSubmit} disabled={saving || !evaluablePlayers || evaluablePlayers.length === 0}>
              {saving ? "Guardando..." : "Guardar evaluaciones"}
            </Button>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-rojo-oscuro">{error}</p>}
        {success && <p className="text-sm text-emerald-400">{success}</p>}

        {!players && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}

        {players && players.length === 0 && <EmptyState title="Este equipo no tiene jugadores cargados" />}

        {type === "MATCH" && context && contextMatch && contextMatch.status !== "PLAYED" && (
          <p className="text-sm text-gris">
            Este partido todavía no tiene resultado cargado en Fixture — se muestra todo el plantel. Una vez cargado el
            resultado, acá solo van a aparecer los jugadores citados.
          </p>
        )}

        {players && players.length > 0 && evaluablePlayers && (
          <Table>
            <Thead>
              <Tr>
                <Th className="sticky left-0 bg-gris-claro">Jugador</Th>
                {dimensions.map((d) => (
                  <Th key={d.id}>{d.key === "performance" ? (type === "TRAINING" ? "Días entrenados (mes)" : "Minutos jugados") : d.name}</Th>
                ))}
                <Th>Observación</Th>
              </Tr>
            </Thead>
            <Tbody>
              {evaluablePlayers.length === 0 && (
                <Tr>
                  <Td colSpan={dimensions.length + 2} className="text-center text-sm text-gris">
                    Ningún jugador citado a este partido.
                  </Td>
                </Tr>
              )}
              {evaluablePlayers.map((p) => (
                <Tr key={p.id}>
                  <Td className="sticky left-0 whitespace-nowrap bg-white font-medium text-carbon">
                    {p.firstName} {p.lastName}
                  </Td>
                  {dimensions.map((d) =>
                    d.key === "performance" ? (
                      <Td key={d.id}>
                        <Input
                          type="number"
                          min={0}
                          max={type === "TRAINING" ? 31 : 130}
                          placeholder={type === "TRAINING" ? "Días" : "Min."}
                          className="w-20"
                          value={scores[p.id]?.[d.id] ?? ""}
                          onChange={(e) => setScore(p.id, d.id, Number(e.target.value))}
                        />
                      </Td>
                    ) : (
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
                    ),
                  )}
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

      <Modal open={glossaryOpen} onClose={() => setGlossaryOpen(false)} widthClass="max-w-xl">
        <h2 className="mb-4 font-display text-xl tracking-wide text-carbon">¿Qué significa cada dato?</h2>
        <div className="space-y-4">
          {METRIC_GLOSSARY.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 font-display text-base tracking-wide text-rojo-oscuro">{group.title}</p>
              <ul className="space-y-0.5 text-sm text-carbon">
                {group.metrics.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-gris">
            &quot;Minutos jugados&quot; (Rendimiento) se ingresa como un número real de minutos, no como una nota 1-10 — se
            convierte automáticamente a la escala 0-10 para el cálculo de la Nota Final (90 minutos = 10). En evaluaciones de
            Entrenamiento, ese mismo campo se reemplaza por &quot;Días entrenados (mes)&quot; (20 días = 10).
          </p>
        </div>
        <Button className="mt-5 w-full" onClick={() => setGlossaryOpen(false)}>
          Entendido
        </Button>
      </Modal>
    </div>
  );
}
