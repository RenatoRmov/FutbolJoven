"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TalentStatus } from "@futboljoven/shared";

export interface StatusBarPoint {
  status: TalentStatus;
  label: string;
  count: number;
}

// Fixed, ordered status ramp (best -> worst) — matches the club's status pill
// colors exactly (see components/ui/Badge.tsx), never reused for unrelated
// categorical series.
const STATUS_COLORS: Record<TalentStatus, string> = {
  PROYECTADO: "#1E7A3E",
  PROYECTABLE: "#1D5FB3",
  EN_DESARROLLO: "#C68A00",
  LIMITADO: "#B4531A",
  NO_APTO: "#8C0E22",
};

/** Distribución de Estatus del plantel — ordered status scale, not a donut. */
export function StatusBarChart({ data }: { data: StatusBarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 160)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="#E6DEDA" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: "#6E6660", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={110} tick={{ fill: "#1A1A1A", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "#F1ECE9" }}
          contentStyle={{ background: "#fff", border: "1px solid #E6DEDA", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#1A1A1A" }}
          formatter={(value: number) => [`${value} jugadores`, "Cantidad"]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
          ))}
          <LabelList dataKey="count" position="right" style={{ fill: "#6E6660", fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
