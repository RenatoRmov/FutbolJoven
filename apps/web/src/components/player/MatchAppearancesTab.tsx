"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";

interface Appearance {
  id: string;
  started: boolean;
  minutesPlayed: number | null;
  goals: number;
  yellowCards: number;
  redCard: boolean;
  match: {
    id: string;
    opponent: string;
    date: string;
    isHome: boolean;
    teamScore: number | null;
    opponentScore: number | null;
    status: string;
  };
}

export function MatchAppearancesTab({ playerId }: { playerId: string }) {
  const [appearances, setAppearances] = useState<Appearance[] | null>(null);

  useEffect(() => {
    api.get<Appearance[]>(`/fixtures/player/${playerId}/appearances`).then(setAppearances);
  }, [playerId]);

  if (!appearances) return <Skeleton className="h-48" />;

  const totalMinutes = appearances.reduce((sum, a) => sum + (a.minutesPlayed ?? 0), 0);
  const totalGoals = appearances.reduce((sum, a) => sum + a.goals, 0);
  const totalYellow = appearances.reduce((sum, a) => sum + a.yellowCards, 0);
  const totalRed = appearances.reduce((sum, a) => sum + (a.redCard ? 1 : 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox label="Minutos totales" value={totalMinutes} />
        <StatBox label="Goles" value={totalGoals} />
        <StatBox label="Amarillas" value={totalYellow} />
        <StatBox label="Rojas" value={totalRed} />
      </div>

      <Card>
        <CardContent className="divide-y divide-borde py-0">
          {appearances.length === 0 ? (
            <EmptyState title="Sin partidos registrados" description="Los minutos y partidos aparecen acá cuando se cierra un partido en Fixture." />
          ) : (
            appearances.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-bold text-carbon">
                    {a.match.isHome ? "vs" : "@"} {a.match.opponent}
                  </p>
                  <p className="text-xs text-gris">
                    {new Date(a.match.date).toLocaleDateString("es-AR")}
                    {a.match.status === "PLAYED" && a.match.teamScore !== null && ` · ${a.match.teamScore}-${a.match.opponentScore}`}
                  </p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="font-display text-lg leading-none text-rojo">{a.minutesPlayed ?? "—"}</p>
                    <p className="text-[9px] uppercase text-gris">Min.</p>
                  </div>
                  <div>
                    <p className="font-display text-lg leading-none text-rojo">{a.goals}</p>
                    <p className="text-[9px] uppercase text-gris">Goles</p>
                  </div>
                  {(a.yellowCards > 0 || a.redCard) && (
                    <div className="flex items-center gap-1">
                      {a.yellowCards > 0 && <span className="inline-block h-3.5 w-2.5 rounded-sm bg-dorado" title={`${a.yellowCards} amarilla(s)`} />}
                      {a.redCard && <span className="inline-block h-3.5 w-2.5 rounded-sm bg-rojo" title="Roja" />}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-borde bg-white px-3 py-3 text-center shadow-sm">
      <p className="font-display text-2xl leading-none text-rojo">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase text-gris">{label}</p>
    </div>
  );
}
