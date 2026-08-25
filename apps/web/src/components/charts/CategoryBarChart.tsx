"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface CategoryBarPoint {
  categoryName: string;
  avgNotaFinal: number | null;
  playerCount: number;
}

/** Nota Final promedio por categoría — single series, sequential accent hue. */
export function CategoryBarChart({ data }: { data: CategoryBarPoint[] }) {
  const rows = data.filter((d) => d.avgNotaFinal !== null);

  return (
    <ResponsiveContainer width="100%" height={Math.max(rows.length * 40, 160)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="#182636" horizontal={false} />
        <XAxis type="number" domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="categoryName" width={130} tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "#182636" }}
          contentStyle={{ background: "#101c29", border: "1px solid #223549", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#e2e8f0" }}
          formatter={(value: number, _name, item) => [`${value} — ${item.payload.playerCount} jugadores`, "Nota Final promedio"]}
        />
        <Bar dataKey="avgNotaFinal" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20}>
          <LabelList dataKey="avgNotaFinal" position="right" style={{ fill: "#94a3b8", fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
