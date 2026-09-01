"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface CategoryBarPoint {
  categoryName: string;
  avgNotaFinal: number | null;
  playerCount: number;
}

/** Nota Final promedio por categoría — single series, club red. */
export function CategoryBarChart({ data }: { data: CategoryBarPoint[] }) {
  const rows = data.filter((d) => d.avgNotaFinal !== null);

  return (
    <ResponsiveContainer width="100%" height={Math.max(rows.length * 40, 160)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="#E6DEDA" horizontal={false} />
        <XAxis type="number" domain={[0, 10]} tick={{ fill: "#6E6660", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="categoryName" width={130} tick={{ fill: "#1A1A1A", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "#F1ECE9" }}
          contentStyle={{ background: "#fff", border: "1px solid #E6DEDA", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#1A1A1A" }}
          formatter={(value: number, _name, item) => [`${value} — ${item.payload.playerCount} jugadores`, "Nota Final promedio"]}
        />
        <Bar dataKey="avgNotaFinal" fill="#C8102E" radius={[0, 4, 4, 0]} barSize={20}>
          <LabelList dataKey="avgNotaFinal" position="right" style={{ fill: "#6E6660", fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
