"use client";

import { StationCard } from "@/components/StationCard";
import type { NearbyStation, StationsMeta } from "@/types/station";

interface StationListProps {
  stations: NearbyStation[];
  selectedId: string | null;
  onSelect: (stationId: string) => void;
  meta: StationsMeta;
  originLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
}

function formatFetchedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

export function StationList({
  stations,
  selectedId,
  onSelect,
  meta,
  originLabel,
  refreshing,
  onRefresh,
}: StationListProps) {
  const fetchedAt = formatFetchedAt(meta.fetchedAt);

  return (
    <section aria-labelledby="station-list-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="station-list-heading" className="text-lg font-semibold tracking-tight text-ink">
            가까운 충전소 {stations.length}곳
          </h2>
          <p className="mt-1 text-[13px] text-ink-faint">
            {originLabel} 기준 직선거리 순
            {fetchedAt ? ` · ${fetchedAt} 조회` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? "새로고침 중" : "새로고침"}
        </button>
      </div>

      {!meta.realtimeAvailable ? (
        <p
          role="status"
          className="mt-3 rounded-lg bg-surface px-3 py-2.5 text-[13px] text-ink-muted"
        >
          실시간 운영 정보를 불러오지 못했습니다. 위치와 기본 정보만 표시합니다.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {stations.map((station) => (
          <StationCard
            key={station.id}
            station={station}
            selected={station.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </ul>

      <p className="mt-4 text-[12px] leading-relaxed text-ink-faint">
        거리는 실제 주행거리가 아닌 직선거리입니다. 운영 정보는 한국석유관리원 공공데이터를 그대로
        표시하며, 제공되지 않는 항목은 화면에 나타나지 않습니다.
      </p>
    </section>
  );
}
