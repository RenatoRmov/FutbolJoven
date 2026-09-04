"use client";

import { useEffect, useState } from "react";
import type { PlayerPosition, PositionGroup } from "@futboljoven/shared";
import { Label, Select } from "@/components/ui/Input";
import { POSITION_GROUPS, POSITION_GROUP_LABELS, POSITION_LABELS, groupForPosition } from "@/lib/types";

/** Grupo → Posición cascading select — picking "Defensa" opens only the defensive positions. */
export function PositionSelect({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (position: string | null) => void;
}) {
  const [group, setGroup] = useState<PositionGroup | "">(() => groupForPosition(value) ?? "");

  useEffect(() => {
    setGroup(groupForPosition(value) ?? "");
  }, [value]);

  const groupOptions = Object.keys(POSITION_GROUPS) as PositionGroup[];
  const positionOptions = group ? POSITION_GROUPS[group] : [];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label>Grupo</Label>
        <Select
          value={group}
          onChange={(e) => {
            const nextGroup = e.target.value as PositionGroup | "";
            setGroup(nextGroup);
            onChange(null);
          }}
        >
          <option value="">Sin definir</option>
          {groupOptions.map((g) => (
            <option key={g} value={g}>
              {POSITION_GROUP_LABELS[g]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Posición</Label>
        <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} disabled={!group}>
          <option value="">Sin definir</option>
          {positionOptions.map((p: PlayerPosition) => (
            <option key={p} value={p}>
              {POSITION_LABELS[p]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
