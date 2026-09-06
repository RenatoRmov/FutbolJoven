"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "@/lib/date";

const COLORS = ["#C8102E", "#F0B429", "#1D5FB3", "#1E7A3E", "#8C0E22", "#B4531A"];

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
        <CartesianGrid stroke="#E6DEDA" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6E6660", fontSize: 11 }}
          tickFormatter={(v: string) => formatDate(v, "es-AR", { day: "2-digit", month: "short" })}
        />
        <YAxis domain={[0, 10]} tick={{ fill: "#6E6660", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#fff", border: "1px solid #E6DEDA", borderRadius: 8, fontSize: 12 }}
          labelFormatter={(v: string) => formatDate(v, "es-AR")}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#6E6660" }} />
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
