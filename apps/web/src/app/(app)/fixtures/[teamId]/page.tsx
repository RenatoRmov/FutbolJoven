"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MATCH_STATUS_LABELS } from "@futboljoven/shared";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api-client";
import { Player, Team } from "@/lib/types";

interface Match {
  id: string;
  opponent: string;
  date: string;
  kickoffTime: string | null;
  meetingTime: string | null;
  city: string | null;
  venue: string | null;
  isHome: boolean;
  coachName: string | null;
  physicalTrainerName: string | null;
  kineName: string | null;
  equipmentManagerName: string | null;
  otherStaffNotes: string | null;
  techStaffArrivalTime: string | null;
  playersArrivalTime: string | null;
  busDepartureTime: string | null;
  meetingPoint: string | null;
  hotelNameAddress: string | null;
  status: string;
  teamScore: number | null;
  opponentScore: number | null;
  appearances: { id: string; playerId: string; minutesPlayed: number | null; goals: number; yellowCards: number; redCard: boolean; player: { firstName: string; lastName: string } }[];
}

type MatchFormState = {
  opponent: string;
  date: string;
  kickoffTime: string;
  meetingTime: string;
  city: string;
  venue: string;
  isHome: string;
  coachName: string;
  physicalTrainerName: string;
  kineName: string;
  equipmentManagerName: string;
  otherStaffNotes: string;
  techStaffArrivalTime: string;
  playersArrivalTime: string;
  busDepartureTime: string;
  meetingPoint: string;
  hotelNameAddress: string;
};

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  SCHEDULED: "info",
  PLAYED: "success",
  POSTPONED: "warning",
  CANCELLED: "danger",
};

const emptyForm: MatchFormState = {
  opponent: "",
  date: new Date().toISOString().slice(0, 10),
  kickoffTime: "",
  meetingTime: "",
  city: "",
  venue: "",
  isHome: "true",
  coachName: "",
  physicalTrainerName: "",
  kineName: "",
  equipmentManagerName: "",
  otherStaffNotes: "",
  techStaffArrivalTime: "",
  playersArrivalTime: "",
  busDepartureTime: "",
  meetingPoint: "",
  hotelNameAddress: "",
};

function matchToForm(match: Match): MatchFormState {
  return {
    opponent: match.opponent,
    date: match.date.slice(0, 10),
    kickoffTime: match.kickoffTime ?? "",
    meetingTime: match.meetingTime ?? "",
    city: match.city ?? "",
    venue: match.venue ?? "",
    isHome: String(match.isHome),
    coachName: match.coachName ?? "",
    physicalTrainerName: match.physicalTrainerName ?? "",
    kineName: match.kineName ?? "",
    equipmentManagerName: match.equipmentManagerName ?? "",
    otherStaffNotes: match.otherStaffNotes ?? "",
    techStaffArrivalTime: match.techStaffArrivalTime ?? "",
    playersArrivalTime: match.playersArrivalTime ?? "",
    busDepartureTime: match.busDepartureTime ?? "",
    meetingPoint: match.meetingPoint ?? "",
    hotelNameAddress: match.hotelNameAddress ?? "",
  };
}

function matchFormToPayload(form: MatchFormState) {
  return {
    opponent: form.opponent,
    date: form.date,
    kickoffTime: form.kickoffTime || null,
    meetingTime: form.meetingTime || null,
    city: form.city || null,
    venue: form.venue || null,
    isHome: form.isHome === "true",
    coachName: form.coachName || null,
    physicalTrainerName: form.physicalTrainerName || null,
    kineName: form.kineName || null,
    equipmentManagerName: form.equipmentManagerName || null,
    otherStaffNotes: form.otherStaffNotes || null,
    ...(form.isHome === "false"
      ? {
          techStaffArrivalTime: form.techStaffArrivalTime || null,
          playersArrivalTime: form.playersArrivalTime || null,
          busDepartureTime: form.busDepartureTime || null,
          meetingPoint: form.meetingPoint || null,
          hotelNameAddress: form.hotelNameAddress || null,
        }
      : { techStaffArrivalTime: null, playersArrivalTime: null, busDepartureTime: null, meetingPoint: null, hotelNameAddress: null }),
  };
}

export default function TeamFixturePage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const teamId = params.teamId;

  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMatchId, setResultMatchId] = useState<string | null>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  function load() {
    if (!teamId) return;
    Promise.all([
      api.get<Team>(`/teams/${teamId}`),
      api.get<Match[]>(`/fixtures/team/${teamId}`),
      api.get<Player[]>(`/players?teamId=${teamId}`),
    ]).then(([t, m, p]) => {
      setTeam(t);
      setMatches(m);
      setPlayers(p);
    });
  }

  useEffect(load, [teamId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/fixtures", { teamId, ...matchFormToPayload(form) });
      setForm(emptyForm);
      setFormKey((k) => k + 1);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el partido");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(matchId: string, updateForm: MatchFormState) {
    await api.patch(`/fixtures/${matchId}`, matchFormToPayload(updateForm));
    setEditingMatchId(null);
    load();
  }

  async function handleDelete(matchId: string) {
    if (!confirm("¿Eliminar este partido? Esta acción no se puede deshacer.")) return;
    await api.delete(`/fixtures/${matchId}`);
    load();
  }

  return (
    <div>
      <Header title={team ? `Fixture — ${team.name}` : "Fixture"} />
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/fixtures")}>
            ← Volver a categorías
          </Button>
          {team && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => api.download(`/reports/teams/${team.id}/pdf`, `reporte-${team.name}.pdf`)}
            >
              Exportar PDF de categoría
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nuevo partido</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-3">
              <MatchFormFields form={form} setForm={setForm} formKey={formKey} />
              <div className="md:col-span-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Crear partido"}
                </Button>
              </div>
            </form>
            {error && <p className="mt-2 text-sm text-rojo-oscuro">{error}</p>}
          </CardContent>
        </Card>

        {!matches && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {matches && matches.length === 0 && <EmptyState title="Todavía no hay partidos cargados" />}

        {matches?.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            players={players ?? []}
            expanded={resultMatchId === match.id}
            editing={editingMatchId === match.id}
            onToggleResult={() => {
              setEditingMatchId(null);
              setResultMatchId(resultMatchId === match.id ? null : match.id);
            }}
            onToggleEdit={() => {
              setResultMatchId(null);
              setEditingMatchId(editingMatchId === match.id ? null : match.id);
            }}
            onSaved={() => {
              setResultMatchId(null);
              load();
            }}
            onUpdate={(updateForm) => handleUpdate(match.id, updateForm)}
            onDelete={() => handleDelete(match.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MatchFormFields({ form, setForm, formKey }: { form: MatchFormState; setForm: (f: MatchFormState) => void; formKey: number }) {
  return (
    <>
      <div>
        <Label>Rival</Label>
        <Input required value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} />
      </div>
      <div>
        <Label>Fecha</Label>
        <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </div>
      <div>
        <Label>Condición</Label>
        <Select value={form.isHome} onChange={(e) => setForm({ ...form, isHome: e.target.value })}>
          <option value="true">Local</option>
          <option value="false">Visita</option>
        </Select>
      </div>
      <div>
        <Label>Hora de citación</Label>
        <Input key={`meetingTime-${formKey}`} type="time" defaultValue={form.meetingTime} onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} />
      </div>
      <div>
        <Label>Hora de partido</Label>
        <Input key={`kickoffTime-${formKey}`} type="time" defaultValue={form.kickoffTime} onChange={(e) => setForm({ ...form, kickoffTime: e.target.value })} />
      </div>
      <div>
        <Label>Ciudad</Label>
        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div>
        <Label>Estadio</Label>
        <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
      </div>
      <div>
        <Label>Técnico</Label>
        <Input value={form.coachName} onChange={(e) => setForm({ ...form, coachName: e.target.value })} />
      </div>
      <div>
        <Label>Preparador físico</Label>
        <Input value={form.physicalTrainerName} onChange={(e) => setForm({ ...form, physicalTrainerName: e.target.value })} />
      </div>
      <div>
        <Label>Kinesiólogo</Label>
        <Input value={form.kineName} onChange={(e) => setForm({ ...form, kineName: e.target.value })} />
      </div>
      <div>
        <Label>Utilero</Label>
        <Input value={form.equipmentManagerName} onChange={(e) => setForm({ ...form, equipmentManagerName: e.target.value })} />
      </div>
      <div className="md:col-span-2">
        <Label>Otros</Label>
        <Input value={form.otherStaffNotes} onChange={(e) => setForm({ ...form, otherStaffNotes: e.target.value })} />
      </div>

      {form.isHome === "false" && (
        <>
          <p className="md:col-span-3 mt-2 font-display text-sm tracking-wide text-rojo-oscuro">Traslados</p>
          <div>
            <Label>Hora presentación cuerpo técnico</Label>
            <Input
              key={`techStaffArrivalTime-${formKey}`}
              type="time"
              defaultValue={form.techStaffArrivalTime}
              onChange={(e) => setForm({ ...form, techStaffArrivalTime: e.target.value })}
            />
          </div>
          <div>
            <Label>Hora presentación jugadores</Label>
            <Input
              key={`playersArrivalTime-${formKey}`}
              type="time"
              defaultValue={form.playersArrivalTime}
              onChange={(e) => setForm({ ...form, playersArrivalTime: e.target.value })}
            />
          </div>
          <div>
            <Label>Hora de salida del bus</Label>
            <Input
              key={`busDepartureTime-${formKey}`}
              type="time"
              defaultValue={form.busDepartureTime}
              onChange={(e) => setForm({ ...form, busDepartureTime: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Punto de encuentro</Label>
            <Input value={form.meetingPoint} onChange={(e) => setForm({ ...form, meetingPoint: e.target.value })} />
          </div>
          <p className="md:col-span-3 mt-1 font-display text-sm tracking-wide text-rojo-oscuro">Alojamiento</p>
          <div className="md:col-span-3">
            <Label>Nombre y dirección del hotel</Label>
            <Input value={form.hotelNameAddress} onChange={(e) => setForm({ ...form, hotelNameAddress: e.target.value })} />
          </div>
        </>
      )}
    </>
  );
}

function MatchCard({
  match,
  players,
  expanded,
  editing,
  onToggleResult,
  onToggleEdit,
  onSaved,
  onUpdate,
  onDelete,
}: {
  match: Match;
  players: Player[];
  expanded: boolean;
  editing: boolean;
  onToggleResult: () => void;
  onToggleEdit: () => void;
  onSaved: () => void;
  onUpdate: (form: MatchFormState) => Promise<void>;
  onDelete: () => void;
}) {
  const totalYellow = match.appearances.reduce((sum, a) => sum + a.yellowCards, 0);
  const totalRed = match.appearances.reduce((sum, a) => sum + (a.redCard ? 1 : 0), 0);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-carbon">
              {match.isHome ? "vs" : "@"} {match.opponent}
            </p>
            <p className="text-xs text-gris">
              {new Date(match.date).toLocaleDateString("es-AR")}
              {match.meetingTime && ` · Citación ${match.meetingTime}`}
              {match.kickoffTime && ` · Partido ${match.kickoffTime}`}
              {match.city && ` · ${match.city}`}
              {match.venue && ` · ${match.venue}`}
            </p>
            {!match.isHome && (match.techStaffArrivalTime || match.playersArrivalTime || match.busDepartureTime || match.meetingPoint || match.hotelNameAddress) && (
              <p className="mt-1 text-[11px] text-gris">
                Traslado:
                {[
                  match.techStaffArrivalTime && `CT ${match.techStaffArrivalTime}`,
                  match.playersArrivalTime && `Jugadores ${match.playersArrivalTime}`,
                  match.busDepartureTime && `Bus ${match.busDepartureTime}`,
                  match.meetingPoint && `Encuentro: ${match.meetingPoint}`,
                  match.hotelNameAddress && `Hotel: ${match.hotelNameAddress}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {(match.coachName || match.physicalTrainerName || match.kineName || match.equipmentManagerName) && (
              <p className="mt-1 text-[11px] text-gris">
                {[match.coachName && `DT: ${match.coachName}`, match.physicalTrainerName && `PF: ${match.physicalTrainerName}`, match.kineName && `Kine: ${match.kineName}`, match.equipmentManagerName && `Utilero: ${match.equipmentManagerName}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {match.status === "PLAYED" && (
              <div className="text-center">
                <p className="font-display text-xl leading-none text-rojo">
                  {match.teamScore}-{match.opponentScore}
                </p>
                {(totalYellow > 0 || totalRed > 0) && (
                  <p className="text-[10px] text-gris">
                    {totalYellow > 0 && `${totalYellow} amarilla(s)`} {totalRed > 0 && `${totalRed} roja(s)`}
                  </p>
                )}
              </div>
            )}
            <Badge tone={STATUS_TONE[match.status] ?? "neutral"}>{MATCH_STATUS_LABELS[match.status as keyof typeof MATCH_STATUS_LABELS] ?? match.status}</Badge>
            {match.status !== "PLAYED" && (
              <Button size="sm" variant="secondary" onClick={onToggleResult}>
                {expanded ? "Cerrar" : "Cargar resultado"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onToggleEdit}>
              {editing ? "Cerrar" : "Editar"}
            </Button>
            <Button size="sm" variant="ghost" className="text-rojo-oscuro" onClick={onDelete}>
              Eliminar
            </Button>
          </div>
        </div>

        {expanded && <ResultForm matchId={match.id} players={players} onSaved={onSaved} />}
        {editing && <EditForm match={match} onSave={onUpdate} onCancel={onToggleEdit} />}
      </CardContent>
    </Card>
  );
}

function EditForm({ match, onSave, onCancel }: { match: Match; onSave: (form: MatchFormState) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<MatchFormState>(() => matchToForm(match));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el partido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3 border-t border-borde pt-4 md:grid-cols-3">
      <MatchFormFields form={form} setForm={setForm} formKey={0} />
      <div className="md:col-span-3 flex items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      {error && <p className="md:col-span-3 text-sm text-rojo-oscuro">{error}</p>}
    </form>
  );
}

function ResultForm({ matchId, players, onSaved }: { matchId: string; players: Player[]; onSaved: () => void }) {
  const [teamScore, setTeamScore] = useState("0");
  const [opponentScore, setOpponentScore] = useState("0");
  const [rows, setRows] = useState<Record<string, { started: boolean; startingEleven: boolean; minutesPlayed: string; goals: string; yellowCards: string; redCard: boolean }>>(() =>
    Object.fromEntries(players.map((p) => [p.id, { started: false, startingEleven: false, minutesPlayed: "", goals: "0", yellowCards: "0", redCard: false }])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startingElevenCount = Object.values(rows).filter((r) => r.startingEleven).length;

  function setRow(playerId: string, patch: Partial<(typeof rows)[string]>) {
    setRows((prev) => {
      const next = { ...prev[playerId], ...patch };
      if (!next.started) next.startingEleven = false; // no puede ser titular sin estar citado
      return { ...prev, [playerId]: next };
    });
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const appearances = players
        .map((p) => {
          const r = rows[p.id];
          if (!r.started && !r.minutesPlayed) return null;
          return {
            playerId: p.id,
            started: r.started,
            startingEleven: r.startingEleven,
            minutesPlayed: r.minutesPlayed ? Number(r.minutesPlayed) : null,
            goals: Number(r.goals || 0),
            yellowCards: Number(r.yellowCards || 0),
            redCard: r.redCard,
          };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);

      if (appearances.length === 0) throw new ApiError(400, "Cargá al menos un jugador con minutos o citado");

      await api.post(`/fixtures/${matchId}/result`, { teamScore: Number(teamScore), opponentScore: Number(opponentScore), appearances });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el resultado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-borde pt-4">
      <div className="flex items-end gap-3">
        <div>
          <Label>Goles equipo</Label>
          <Input type="number" min={0} className="w-20" value={teamScore} onChange={(e) => setTeamScore(e.target.value)} />
        </div>
        <div>
          <Label>Goles rival</Label>
          <Input type="number" min={0} className="w-20" value={opponentScore} onChange={(e) => setOpponentScore(e.target.value)} />
        </div>
      </div>

      <p className="text-xs text-gris">
        Titulares: <span className={startingElevenCount > 11 ? "font-semibold text-rojo-oscuro" : "font-semibold text-carbon"}>{startingElevenCount}/11</span>
      </p>

      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gris">
              <th className="py-1 pr-2">Jugador</th>
              <th className="px-2">Citado</th>
              <th className="px-2">Titular</th>
              <th className="px-2">Minutos</th>
              <th className="px-2">Goles</th>
              <th className="px-2">Amarillas</th>
              <th className="px-2">Roja</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-t border-borde">
                <td className="py-1.5 pr-2 font-medium text-carbon">
                  {p.firstName} {p.lastName}
                </td>
                <td className="px-2">
                  <input type="checkbox" checked={rows[p.id]?.started ?? false} onChange={(e) => setRow(p.id, { started: e.target.checked })} />
                </td>
                <td className="px-2">
                  <input
                    type="checkbox"
                    checked={rows[p.id]?.startingEleven ?? false}
                    disabled={!rows[p.id]?.started || (!rows[p.id]?.startingEleven && startingElevenCount >= 11)}
                    onChange={(e) => setRow(p.id, { startingEleven: e.target.checked })}
                  />
                </td>
                <td className="px-2">
                  <Input type="number" min={0} max={150} className="w-16" value={rows[p.id]?.minutesPlayed ?? ""} onChange={(e) => setRow(p.id, { minutesPlayed: e.target.value })} />
                </td>
                <td className="px-2">
                  <Input type="number" min={0} className="w-14" value={rows[p.id]?.goals ?? "0"} onChange={(e) => setRow(p.id, { goals: e.target.value })} />
                </td>
                <td className="px-2">
                  <Select className="w-16" value={rows[p.id]?.yellowCards ?? "0"} onChange={(e) => setRow(p.id, { yellowCards: e.target.value })}>
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </Select>
                </td>
                <td className="px-2">
                  <input type="checkbox" checked={rows[p.id]?.redCard ?? false} onChange={(e) => setRow(p.id, { redCard: e.target.checked })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-rojo-oscuro">{error}</p>}
      <Button onClick={handleSubmit} disabled={saving}>
        {saving ? "Guardando..." : "Guardar resultado"}
      </Button>
    </div>
  );
}
