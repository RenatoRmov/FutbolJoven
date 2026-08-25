"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TalentStatus } from "@futboljoven/shared";

export interface StatusBarPoint {
  status: TalentStatus;
  label: string;
  count: number;
}

// Fixed, ordered status ramp (best -> worst) — never generated, never reused
// for unrelated categorical series.
const STATUS_COLORS: Record<TalentStatus, string> = {
  PROYECTADO: "#22c55e",
  PROYECTABLE: "#38bdf8",
  EN_DESARROLLO: "#facc15",
  LIMITADO: "#f97316",
  NO_APTO: "#ef4444",
};

/** Distribución de Estatus del plantel — ordered status scale, not a donut. */
export function StatusBarChart({ data }: { data: StatusBarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 160)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="#182636" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={110} tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "#182636" }}
          contentStyle={{ background: "#101c29", border: "1px solid #223549", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#e2e8f0" }}
          formatter={(value: number) => [`${value} jugadores`, "Cantidad"]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
          ))}
          <LabelList dataKey="count" position="right" style={{ fill: "#94a3b8", fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
