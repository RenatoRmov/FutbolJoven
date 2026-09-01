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
        <PolarGrid stroke="#E6DEDA" />
        <PolarAngleAxis dataKey="dimensionName" tick={{ fill: "#6E6660", fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, scaleMax]} tick={{ fill: "#9c948d", fontSize: 10 }} tickCount={6} />
        <Radar name="Actual" dataKey="current" stroke="#C8102E" fill="#C8102E" fillOpacity={0.3} />
        <Radar name="Anterior" dataKey="previous" stroke="#F0B429" fill="#F0B429" fillOpacity={0.08} />
        <Radar name="Promedio categoría" dataKey="teamAverage" stroke="#6E6660" fill="none" strokeDasharray="4 3" />
        <Legend wrapperStyle={{ fontSize: 12, color: "#6E6660" }} />
        <Tooltip
          contentStyle={{ background: "#fff", border: "1px solid #E6DEDA", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#1A1A1A" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
