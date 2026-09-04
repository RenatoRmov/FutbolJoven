"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface RecoveryBarPoint {
  label: string;
  days: number;
}

/** Días de recuperación por lesión — para ver de un vistazo cómo evolucionan los tiempos de recuperación del jugador. */
export function RecoveryBarChart({ data }: { data: RecoveryBarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 34, 120)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="#E6DEDA" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: "#6E6660", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={140} tick={{ fill: "#1A1A1A", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "#F1ECE9" }}
          contentStyle={{ background: "#fff", border: "1px solid #E6DEDA", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#1A1A1A" }}
          formatter={(value: number) => [`${value} días`, "Recuperación"]}
        />
        <Bar dataKey="days" fill="#8C0E22" radius={[0, 4, 4, 0]} barSize={18}>
          <LabelList dataKey="days" position="right" style={{ fill: "#6E6660", fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
