"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import EmptyState from "@/components/EmptyState";
import ErrorMessage from "@/components/ErrorMessage";
import Hero from "@/components/Hero";
import KakaoMap from "@/components/KakaoMap";
import Loading, { CardSkeleton } from "@/components/Loading";
import StationList from "@/components/StationList";
import { isValidLatLng, type LatLng } from "@/lib/geo";
import type { ApiErrorBody, NearbyResponse } from "@/types/station";

type Phase = "intro" | "locating" | "loading" | "ready";

interface Failure {
  title: string;
  description: string;
  /** 주소 검색 대체 수단을 함께 보여줄지 */
  offerAddress: boolean;
  retry: boolean;
}

const GEO_FAILURES: Record<number, Failure> = {
  1: {
    title: "현재 위치를 확인할 수 없습니다",
    description:
      "위치 권한을 허용해주세요. 브라우저 주소창의 자물쇠 아이콘에서 위치 접근을 허용한 뒤 다시 시도할 수 있습니다.",
    offerAddress: true,
    retry: true,
  },
  2: {
    title: "위치 신호를 받지 못했습니다",
    description: "실내이거나 GPS 신호가 약할 수 있습니다. 잠시 후 다시 시도하거나 지역을 직접 검색해 주세요.",
    offerAddress: true,
    retry: true,
  },
  3: {
    title: "위치 확인이 오래 걸립니다",
    description: "위치를 가져오는 데 실패했습니다. 다시 시도하거나 지역을 직접 검색해 주세요.",
    offerAddress: true,
    retry: true,
  },
};

export default function Finder() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originLabel, setOriginLabel] = useState("현재 위치");
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const scrolledOnceRef = useRef(false);

  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchStations = useCallback(async (point: LatLng) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("loading");
    setFailure(null);

    try {
      const response = await fetch(`/api/stations?lat=${point.lat}&lng=${point.lng}&limit=5`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setFailure({
          title: "충전소 정보를 불러오지 못했습니다",
          description:
            body?.error.message ?? "잠시 후 다시 시도해 주세요. 문제가 계속되면 네트워크 상태를 확인해 주세요.",
          offerAddress: false,
          retry: true,
        });
        setPhase("ready");
        return;
      }

      const payload = (await response.json()) as NearbyResponse;
      setData(payload);
      setSelectedId(payload.stations[0]?.id ?? null);
      setPhase("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFailure({
        title: "네트워크 오류가 발생했습니다",
        description: "인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
        offerAddress: false,
        retry: true,
      });
      setPhase("ready");
    }
  }, []);

  const applyLocation = useCallback(
    (point: LatLng, label: string) => {
      setOrigin(point);
      setOriginLabel(label);
      void fetchStations(point);
    },
    [fetchStations],
  );

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setOrigin(null);
      setFailure({
        title: "이 브라우저는 위치 기능을 지원하지 않습니다",
        description: "지역이나 주소를 직접 검색해서 가까운 충전소를 찾을 수 있습니다.",
        offerAddress: true,
        retry: false,
      });
      setPhase("ready");
      return;
    }

    setPhase("locating");
    setFailure(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!isValidLatLng(point)) {
          setFailure(GEO_FAILURES[2]!);
          setPhase("ready");
          return;
        }
        applyLocation(point, "현재 위치");
      },
      (error) => {
        setFailure(GEO_FAILURES[error.code] ?? GEO_FAILURES[2]!);
        setPhase("ready");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [applyLocation]);

  // 결과가 "처음" 도착했을 때만 결과 영역으로 이동합니다.
  // (새로고침할 때마다 스크롤이 튀면 오히려 방해가 됩니다.)
  useEffect(() => {
    if (phase === "ready" && data && !scrolledOnceRef.current) {
      scrolledOnceRef.current = true;
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [phase, data]);

  // 모바일에서는 지도와 목록이 위아래로 떨어져 있어, 카드를 누르면
  // 지도가 화면 밖에 있는 경우가 생깁니다. 이때만 지도를 끌어옵니다.
  const selectStation = useCallback((id: string) => {
    setSelectedId(id);
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;
    const map = mapRef.current;
    if (!map) return;
    const { top, bottom } = map.getBoundingClientRect();
    if (bottom < 80 || top > window.innerHeight - 80) {
      map.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const retry = useCallback(() => {
    if (origin) void fetchStations(origin);
    else start();
  }, [origin, fetchStations, start]);

  if (phase === "intro") {
    return <Hero onStart={start} busy={false} />;
  }

  if (phase === "locating") {
    return <Hero onStart={start} busy />;
  }

  const stations = data?.stations ?? [];
  const loading = phase === "loading";

  return (
    <div ref={resultRef} className="mx-auto max-w-page px-6 py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tightest text-ink sm:text-3xl">
            가까운 수소충전소
          </h1>
          {stations.length > 0 ? (
            <p className="mt-1.5 text-sm text-ink-muted">
              {originLabel} 기준 · 가까운 순 {stations.length}곳
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-ink-muted">{originLabel} 기준</p>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={retry} disabled={loading} className="btn-ghost">
            {loading ? "새로고침 중" : "새로고침"}
          </button>
          <button type="button" onClick={start} disabled={loading} className="btn-ghost">
            내 위치 다시 찾기
          </button>
        </div>
      </header>

      {failure ? (
        <div className="mt-8">
          <ErrorMessage
            title={failure.title}
            description={failure.description}
            actionLabel={failure.retry ? "다시 시도" : undefined}
            onAction={failure.retry ? retry : undefined}
          >
            {failure.offerAddress ? <AddressSearch onPick={applyLocation} /> : null}
          </ErrorMessage>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 flex flex-col gap-4">
          <Loading message="주변 충전소와 실시간 정보를 불러오는 중…" />
          <CardSkeleton />
        </div>
      ) : null}

      {!loading && !failure && origin ? (
        stations.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="주변에서 충전소를 찾지 못했습니다"
              description="현재 위치 근처에 등록된 수소충전소가 없습니다. 다른 지역으로 검색해 보세요."
            >
              <AddressSearch onPick={applyLocation} />
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-start">
              <div
                ref={mapRef}
                className="h-[46vh] min-h-[320px] scroll-mt-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]"
              >
                <KakaoMap
                  origin={origin}
                  stations={stations}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onError={(message: string) =>
                    setFailure({
                      title: "지도를 표시할 수 없습니다",
                      description: message,
                      offerAddress: false,
                      retry: true,
                    })
                  }
                />
              </div>

              <StationList stations={stations} selectedId={selectedId} onSelect={selectStation} />
            </div>

            <footer className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
              <p>
                거리는 위경도 기준 직선거리이며 실제 주행거리와 다를 수 있습니다. 여유·보통·혼잡은
                공공데이터의 대기 차량 수(0대 / 1~2대 / 3대 이상)를 기준으로 표시합니다.
              </p>
              {data?.meta.degraded.includes("realtime") ? (
                <p className="mt-2 text-status-normal">
                  지금은 실시간 정보를 불러오지 못해 위치와 거리만 표시하고 있습니다.
                </p>
              ) : null}
              {data && !data.meta.realtimeAvailable && !data.meta.degraded.includes("realtime") ? (
                <p className="mt-2">이 충전소들은 실시간 정보를 제공하지 않습니다.</p>
              ) : null}
              <p className="mt-2">출처 · 한국석유관리원 수소충전소 공공데이터 / 지도 · 카카오맵</p>
            </footer>
          </>
        )
      ) : null}
    </div>
  );
}
