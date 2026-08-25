"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MetricPoint {
  date: string;
  value: number;
}

/** Single-metric trend with an auto-fit Y domain (weight, IMC, etc. — not a fixed 0-10 scale). */
export function MetricLineChart({ data, unit, color = "#22c55e" }: { data: MetricPoint[]; unit?: string; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#182636" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => new Date(v).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
        />
        <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: "#101c29", border: "1px solid #223549", borderRadius: 8, fontSize: 12 }}
          labelFormatter={(v: string) => new Date(v).toLocaleDateString("es-AR")}
          formatter={(value: number) => [`${value}${unit ?? ""}`, ""]}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 4, fill: color, stroke: "#0a121c", strokeWidth: 2 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
