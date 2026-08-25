"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  week: string;
  avgNotaFinal: number | null;
}

/** Tendencia de la Nota Final promedio del club — single series, no legend needed. */
export function TrendLineChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#182636" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => new Date(v).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
        />
        <YAxis domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#101c29", border: "1px solid #223549", borderRadius: 8, fontSize: 12 }}
          labelFormatter={(v: string) => `Semana del ${new Date(v).toLocaleDateString("es-AR")}`}
          formatter={(value: number) => [value, "Nota Final promedio"]}
        />
        <Area
          type="monotone"
          dataKey="avgNotaFinal"
          stroke="#22c55e"
          strokeWidth={2}
          fill="#22c55e"
          fillOpacity={0.1}
          dot={{ r: 4, fill: "#22c55e", stroke: "#0a121c", strokeWidth: 2 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
