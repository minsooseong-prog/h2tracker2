"use client";

import { formatDistance } from "@/lib/geo";
import RankMarker from "@/components/RankMarker";
import StatusBadge from "@/components/StatusBadge";
import type { NearbyStation } from "@/types/station";

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd className="tnum text-ink">{value}</dd>
    </div>
  );
}

export default function StationCard({
  station,
  active,
  onSelect,
}: {
  station: NearbyStation;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const { realtime } = station;

  const dispensers =
    realtime?.dispenserTotal !== null && realtime?.dispenserTotal !== undefined
      ? [
          realtime.dispenserAvailable !== null ? `사용 가능 ${realtime.dispenserAvailable}` : null,
          realtime.dispenserInUse !== null ? `사용 중 ${realtime.dispenserInUse}` : null,
          `전체 ${realtime.dispenserTotal}`,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <li>
      <article
        aria-current={active ? "true" : undefined}
        className={`rounded-2xl border bg-white p-5 transition-shadow ${
          active ? "border-brand shadow-lift" : "border-line shadow-card hover:shadow-lift"
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect(station.id)}
          aria-label={`${station.rank}순위 ${station.name}, ${formatDistance(station.distanceMeters)} 떨어짐. 지도에서 보기`}
          className="flex w-full items-start gap-3 text-left"
        >
          <RankMarker rank={station.rank} active={active} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[17px] font-semibold tracking-tightest text-ink">{station.name}</span>
              <StatusBadge congestion={station.congestion} size="sm" />
            </span>
            {station.address ? (
              <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{station.address}</span>
            ) : null}
          </span>
          <span className="tnum shrink-0 text-right">
            <span className="block text-[17px] font-semibold text-brand">
              {formatDistance(station.distanceMeters)}
            </span>
            <span className="block text-[11px] text-ink-faint">직선거리</span>
          </span>
        </button>

        {realtime ? (
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-line pt-4 sm:grid-cols-2">
            {realtime.waitingVehicles !== null ? (
              <Detail label="대기 차량" value={`${realtime.waitingVehicles}대`} />
            ) : null}
            {realtime.chargeableVehicles !== null ? (
              <Detail label="완충 가능" value={`${realtime.chargeableVehicles}대`} />
            ) : null}
            <Detail label="충전기" value={dispensers} />
            {realtime.tubeTrailerPressure !== null ? (
              <Detail label="트레일러 압력" value={`${realtime.tubeTrailerPressure}bar`} />
            ) : null}
            {realtime.pricePerKg !== null ? (
              <Detail label="판매가" value={`${realtime.pricePerKg.toLocaleString("ko-KR")}원/kg`} />
            ) : null}
            <Detail label="운영 시간" value={station.businessHours} />
            <Detail label="운영 상태" value={realtime.operationStatus} />
            <Detail label="전화" value={station.phone} />
            <Detail label="기준" value={realtime.updatedAt} />
          </dl>
        ) : (
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-line pt-4 sm:grid-cols-2">
            <Detail label="운영 시간" value={station.businessHours} />
            <Detail label="전화" value={station.phone} />
            <Detail label="충전 가능 차량" value={station.vehicleTypes} />
            <p className="col-span-full text-sm text-ink-faint">
              이 충전소는 실시간 정보를 제공하지 않습니다.
            </p>
          </dl>
        )}

        {realtime?.notice ? (
          <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm leading-relaxed text-ink-muted">
            {realtime.notice}
          </p>
        ) : null}
      </article>
    </li>
  );
}
