"use client";

import { useCallback, useId, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { isPlausibleKoreanCoordinate } from "@/lib/distance";
import type { Coordinates } from "@/types/station";

interface RegionSearchProps {
  /** 카카오 SDK 가 준비되지 않았으면 검색을 시도하지 않는다. */
  ready: boolean;
  onPick: (coordinates: Coordinates, label: string) => void;
  compact?: boolean;
}

interface SearchHit {
  id: string;
  label: string;
  detail: string;
  lat: number;
  lng: number;
}

type SearchStatus = "idle" | "searching" | "empty" | "error" | "unavailable";

/**
 * 위치 권한을 거부했거나 사용할 수 없을 때의 대체 경로.
 * 카카오맵 SDK 의 장소 검색으로 지역·주소를 좌표로 바꾼다.
 */
export function RegionSearch({ ready, onPick, compact = false }: RegionSearchProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");

  const search = useCallback(() => {
    const keyword = query.trim();
    if (!keyword) return;

    const services = ready ? window.kakao?.maps?.services : undefined;
    if (!services) {
      setStatus("unavailable");
      return;
    }

    setStatus("searching");
    setHits([]);

    new services.Places().keywordSearch(
      keyword,
      (results, resultStatus) => {
        if (resultStatus !== services.Status.OK) {
          setStatus(resultStatus === services.Status.ZERO_RESULT ? "empty" : "error");
          return;
        }

        const parsed: SearchHit[] = [];
        for (const item of results) {
          const lat = Number(item.y);
          const lng = Number(item.x);
          if (!isPlausibleKoreanCoordinate(lat, lng)) continue;
          parsed.push({
            id: item.id,
            label: item.place_name,
            detail: item.road_address_name || item.address_name,
            lat,
            lng,
          });
          if (parsed.length === 5) break;
        }

        setHits(parsed);
        setStatus(parsed.length === 0 ? "empty" : "idle");
      },
      { size: 10 },
    );
  }, [query, ready]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    search();
  };

  const notice: Record<Exclude<SearchStatus, "idle" | "searching">, string> = {
    empty: "검색 결과가 없습니다. 시·군·구 이름이나 잘 알려진 건물 이름으로 다시 시도해 보세요.",
    error: "장소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    unavailable: "지도를 불러오지 못해 장소 검색을 사용할 수 없습니다. 페이지를 새로고침해 주세요.",
  };

  return (
    <div className={compact ? "" : "mx-auto max-w-md"}>
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        지역이나 주소로 찾기
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="예: 창원시청, 강남역, 울산 남구"
          className="min-w-0 flex-1 rounded-full border border-line bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={search}
          disabled={status === "searching" || query.trim() === ""}
          className="shrink-0 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "searching" ? "검색 중" : "검색"}
        </button>
      </div>

      <div aria-live="polite">
        {status !== "idle" && status !== "searching" ? (
          <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{notice[status]}</p>
        ) : null}

        {hits.length > 0 ? (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[14px] border border-line">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => onPick({ lat: hit.lat, lng: hit.lng }, hit.label)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-surface"
                >
                  <span className="block text-sm font-medium text-ink">{hit.label}</span>
                  {hit.detail ? (
                    <span className="mt-0.5 block text-[13px] text-ink-faint">{hit.detail}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
