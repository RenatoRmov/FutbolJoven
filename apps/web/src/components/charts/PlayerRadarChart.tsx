"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend, Tooltip } from "recharts";

export interface RadarPoint {
  dimensionName: string;
  current: number | null;
  previous: number | null;
  teamAverage: number | null;
}

export function PlayerRadarChart({ data, scaleMax = 10 }: { data: RadarPoint[]; scaleMax?: number }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="#223549" />
        <PolarAngleAxis dataKey="dimensionName" tick={{ fill: "#94a3b8", fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, scaleMax]} tick={{ fill: "#64748b", fontSize: 10 }} tickCount={6} />
        <Radar name="Actual" dataKey="current" stroke="#22c55e" fill="#22c55e" fillOpacity={0.35} />
        <Radar name="Anterior" dataKey="previous" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.08} />
        <Radar name="Promedio categoría" dataKey="teamAverage" stroke="#94a3b8" fill="none" strokeDasharray="4 3" />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Tooltip
          contentStyle={{ background: "#101c29", border: "1px solid #223549", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#e2e8f0" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
