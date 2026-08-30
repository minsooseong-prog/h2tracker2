"use client";

import { ChargerGauge } from "@/components/ChargerGauge";
import { CongestionBadge, OperationBadge } from "@/components/StatusBadge";
import { describeDistance, formatDistance } from "@/lib/distance";
import type { NearbyStation } from "@/types/station";

interface StationCardProps {
  station: NearbyStation;
  selected: boolean;
  onSelect: (stationId: string) => void;
}

/** 지도 마커에서 해당 카드로 스크롤하기 위한 DOM id. 특수문자를 제거해 안전하게 만든다. */
export function stationDomId(stationId: string): string {
  return `station-${stationId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/** 값이 없으면 그 줄 자체를 그리지 않는다. */
function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-[13px]">
      <dt className="w-20 shrink-0 text-ink-faint">{label}</dt>
      <dd className="tnum text-ink-muted">{value}</dd>
    </div>
  );
}

export function StationCard({ station, selected, onSelect }: StationCardProps) {
  const { realtime } = station;

  const waiting = realtime?.waitingVehicles ?? null;
  const chargeable = realtime?.chargeableVehicles ?? null;
  const pressure = realtime?.tubeTrailerPressure ?? null;
  const price = realtime?.pricePerKg ?? null;

  return (
    <li id={stationDomId(station.id)} className="scroll-mt-[calc(38vh+1.5rem)] lg:scroll-mt-6">
      <button
        type="button"
        onClick={() => onSelect(station.id)}
        aria-pressed={selected}
        aria-label={`${station.rank}번째로 가까운 ${station.name}, ${describeDistance(
          station.distanceMeters,
        )}. 지도에서 보기`}
        className={`w-full rounded-[14px] border bg-paper p-4 text-left transition-colors sm:p-5 ${
          selected
            ? "border-accent ring-1 ring-accent"
            : "border-line hover:border-line-strong hover:bg-surface"
        }`}
      >
        <div className="flex items-start gap-3">
          {/* 순위는 장식이 아니라 거리 순서라는 정보를 담고 있다. */}
          <span
            aria-hidden="true"
            className={`tnum mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
              selected ? "bg-accent text-paper" : "bg-surface-strong text-ink-muted"
            }`}
          >
            {station.rank}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="truncate text-[15px] font-semibold text-ink sm:text-base">
                {station.name}
              </h3>
              <span className="tnum shrink-0 text-[15px] font-semibold text-accent">
                {formatDistance(station.distanceMeters)}
              </span>
            </div>

            {station.address ? (
              <p className="mt-1 truncate text-[13px] text-ink-faint">{station.address}</p>
            ) : (
              <p className="mt-1 text-[13px] text-ink-faint">주소 정보 없음</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {realtime ? (
                <>
                  <OperationBadge
                    status={realtime.operationStatus}
                    rawLabel={realtime.operationStatusLabel}
                  />
                  <CongestionBadge
                    level={realtime.congestion}
                    rawLabel={realtime.congestionLabel}
                    derivedFromWaiting={realtime.congestionSource === "waiting-count"}
                  />
                  {waiting !== null ? (
                    <span className="tnum rounded-full bg-surface-strong px-2.5 py-1 text-[13px] leading-none font-medium text-ink-muted">
                      대기 {waiting}대
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="rounded-full bg-surface-strong px-2.5 py-1 text-[13px] leading-none text-ink-faint">
                  실시간 정보 없음
                </span>
              )}
            </div>

            {realtime?.chargerTotal ? (
              <div className="mt-3">
                <ChargerGauge
                  total={realtime.chargerTotal}
                  available={realtime.chargerAvailable}
                  inUse={realtime.chargerInUse}
                />
              </div>
            ) : null}

            <dl className="mt-3 space-y-1 border-t border-line pt-3">
              <DetailRow label="운영 시간" value={station.businessHours} />
              <DetailRow label="휴무일" value={station.holiday} />
              <DetailRow
                label="완충 가능"
                value={chargeable !== null ? `${chargeable}대분 잔여` : null}
              />
              <DetailRow
                label="트레일러 압력"
                value={pressure !== null ? `${pressure} bar` : null}
              />
              <DetailRow
                label="판매 가격"
                value={price !== null ? `${price.toLocaleString("ko-KR")}원/kg` : null}
              />
              <DetailRow label="전화" value={station.phone} />
            </dl>

            {realtime?.updatedAt ? (
              <p className="tnum mt-2 text-[12px] text-ink-faint">
                실시간 기준 {realtime.updatedAt}
              </p>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}
