"use client";

import { useId, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao";
import type { LatLng } from "@/lib/geo";

interface Candidate extends LatLng {
  label: string;
  detail: string;
}

export default function AddressSearch({
  onPick,
}: {
  onPick: (point: LatLng, label: string) => void;
}) {
  const inputId = useId();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const query = keyword.trim();
    if (query.length < 2) {
      setError("두 글자 이상 입력해 주세요.");
      return;
    }

    setSearching(true);
    setError(null);
    setResults(null);

    try {
      const sdk = await loadKakaoMaps();
      const places = new sdk.maps.services.Places();

      places.keywordSearch(query, (data, status) => {
        setSearching(false);

        if (status === sdk.maps.services.Status.ZERO_RESULT) {
          setResults([]);
          return;
        }
        if (status !== sdk.maps.services.Status.OK) {
          setError("주소를 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        setResults(
          data.slice(0, 5).map((item) => ({
            label: item.place_name,
            detail: item.road_address_name || item.address_name,
            lat: Number(item.y),
            lng: Number(item.x),
          })),
        );
      });
    } catch {
      setSearching(false);
      setError("주소 검색 기능을 불러오지 못했습니다.");
    }
  };

  return (
    <div className="mt-6 border-t border-line pt-6">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        지역이나 주소로 찾기
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void search();
          }}
          placeholder="예) 춘천시청, 강남역"
          className="min-h-[48px] w-full rounded-xl border border-line bg-white px-4 text-base text-ink placeholder:text-ink-faint focus:border-brand"
        />
        <button type="button" onClick={() => void search()} disabled={searching} className="btn-ghost shrink-0 px-6">
          {searching ? "검색 중" : "검색"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-status-busy">
          {error}
        </p>
      ) : null}

      {results !== null ? (
        results.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">검색 결과가 없습니다. 다른 이름으로 검색해 보세요.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
            {results.map((candidate) => (
              <li key={`${candidate.lat},${candidate.lng},${candidate.label}`}>
                <button
                  type="button"
                  onClick={() => onPick({ lat: candidate.lat, lng: candidate.lng }, candidate.label)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-surface"
                >
                  <span className="block text-sm font-medium text-ink">{candidate.label}</span>
                  <span className="block text-xs text-ink-muted">{candidate.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
