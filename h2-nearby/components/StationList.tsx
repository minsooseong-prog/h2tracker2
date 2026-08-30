"use client";

import StationCard from "@/components/StationCard";
import type { NearbyStation } from "@/types/station";

export default function StationList({
  stations,
  selectedId,
  onSelect,
}: {
  stations: NearbyStation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ol className="flex flex-col gap-3" aria-label="가까운 수소충전소 목록">
      {stations.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          active={station.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ol>
  );
}
