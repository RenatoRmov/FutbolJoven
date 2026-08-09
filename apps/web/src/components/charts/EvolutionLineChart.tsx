"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#22c55e", "#38bdf8", "#f97316", "#a78bfa", "#facc15", "#f472b6"];

export interface EvolutionSeries {
  dimensionName: string;
  points: { date: string; value: number }[];
}

export function EvolutionLineChart({ series }: { series: EvolutionSeries[] }) {
  // Recharts wants one array of rows keyed by date, each dimension as a column.
  const dateSet = new Set<string>();
  series.forEach((s) => s.points.forEach((p) => dateSet.add(p.date)));
  const dates = Array.from(dateSet).sort();

  const rows = dates.map((date) => {
    const row: Record<string, string | number> = { date };
    series.forEach((s) => {
      const point = s.points.find((p) => p.date === date);
      if (point) row[s.dimensionName] = point.value;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#182636" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickFormatter={(v: string) => new Date(v).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
        />
        <YAxis domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#101c29", border: "1px solid #223549", borderRadius: 8, fontSize: 12 }}
          labelFormatter={(v: string) => new Date(v).toLocaleDateString("es-AR")}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        {series.map((s, i) => (
          <Line
            key={s.dimensionName}
            type="monotone"
            dataKey={s.dimensionName}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
