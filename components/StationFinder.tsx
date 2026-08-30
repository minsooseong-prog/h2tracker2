"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Hero } from "@/components/Hero";
import { KakaoMap } from "@/components/KakaoMap";
import { RegionSearch } from "@/components/RegionSearch";
import { stationDomId } from "@/components/StationCard";
import { StationList } from "@/components/StationList";
import { EmptyState, ErrorMessage, LoadingState } from "@/components/States";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useKakaoLoader } from "@/hooks/useKakaoLoader";
import { useNearestStations } from "@/hooks/useNearestStations";
import type { Coordinates } from "@/types/station";

type Phase = "intro" | "active";
type StartMode = "geolocation" | "search";

export function StationFinder() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [mode, setMode] = useState<StartMode>("geolocation");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const geo = useGeolocation();
  const kakao = useKakaoLoader(phase === "active");
  const stations = useNearestStations(geo.coordinates);

  const resultsRef = useRef<HTMLDivElement | null>(null);
  /** 결과 영역으로의 자동 스크롤은 검색 1회당 한 번만 한다. */
  const scrolledForRef = useRef<string | null>(null);

  const requestLocation = geo.request;
  const setManualCoordinates = geo.setManualCoordinates;
  const resetLocation = geo.reset;

  const handleStart = useCallback(() => {
    setMode("geolocation");
    setPhase("active");
    requestLocation();
  }, [requestLocation]);

  const handleSkipToSearch = useCallback(() => {
    setMode("search");
    setPhase("active");
  }, []);

  const handlePickRegion = useCallback(
    (coordinates: Coordinates, label: string) => {
      setSelectedId(null);
      setManualCoordinates(coordinates, label);
    },
    [setManualCoordinates],
  );

  const handleSelectFromMap = useCallback((stationId: string) => {
    setSelectedId(stationId);
    const element = document.getElementById(stationDomId(stationId));
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleSelectFromList = useCallback((stationId: string) => {
    setSelectedId((current) => (current === stationId ? null : stationId));
  }, []);

  /* 결과가 준비되면 화면을 결과 영역으로 옮겨준다. 새로고침에는 반응하지 않는다. */
  useEffect(() => {
    if (stations.status !== "success" || !geo.coordinates) return;
    const key = `${geo.coordinates.lat},${geo.coordinates.lng}`;
    if (scrolledForRef.current === key) return;
    scrolledForRef.current = key;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stations.status, geo.coordinates]);

  if (phase === "intro") {
    return (
      <Hero onStart={handleStart} onSkipToSearch={handleSkipToSearch} />
    );
  }

  const originLabel = geo.manualLabel ?? "현재 위치";
  const locationBlocked = geo.state === "denied" || geo.state === "unavailable";
  const needsLocation = !geo.coordinates;

  return (
    <div ref={resultsRef} className="mx-auto max-w-6xl px-5 pt-8 pb-16 sm:pt-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] text-ink-faint">기준 위치</p>
          <p className="truncate text-base font-semibold text-ink">{originLabel}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setMode("geolocation");
              requestLocation();
            }}
            className="rounded-full border border-line px-3.5 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            현재 위치로
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setMode("search");
              resetLocation();
            }}
            className="rounded-full border border-line px-3.5 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            지역 변경
          </button>
        </div>
      </header>

      {/* 위치를 아직 못 정한 단계 */}
      {needsLocation ? (
        <div className="space-y-6">
          {geo.state === "locating" ? (
            <LoadingState message="현재 위치를 확인하는 중입니다" />
          ) : null}

          {locationBlocked ? (
            <ErrorMessage
              title="현재 위치를 확인할 수 없습니다"
              description={geo.message ?? "위치 권한을 허용해 주세요."}
              actionLabel="위치 다시 요청"
              onAction={requestLocation}
            >
              <RegionSearch ready={kakao.state === "ready"} onPick={handlePickRegion} compact />
            </ErrorMessage>
          ) : null}

          {mode === "search" && !locationBlocked ? (
            <div className="rounded-[14px] border border-line px-5 py-8 sm:px-6">
              <RegionSearch ready={kakao.state === "ready"} onPick={handlePickRegion} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 위치는 정해졌고 데이터를 부르는 단계 */}
      {geo.coordinates && stations.status === "loading" ? (
        <LoadingState message="주변 수소충전소와 실시간 정보를 불러오는 중입니다" />
      ) : null}

      {geo.coordinates && stations.status === "error" ? (
        <ErrorMessage
          title="충전소 정보를 불러오지 못했습니다"
          description={stations.errorMessage ?? "잠시 후 다시 시도해 주세요."}
          actionLabel="다시 시도"
          onAction={stations.refresh}
        >
          <RegionSearch ready={kakao.state === "ready"} onPick={handlePickRegion} compact />
        </ErrorMessage>
      ) : null}

      {/* 결과 */}
      {stations.data && stations.data.stations.length === 0 ? (
        <EmptyState
          title="주변에서 찾을 수 있는 충전소가 없습니다"
          description="이 위치 근처에는 등록된 수소충전소가 없습니다. 다른 지역으로 검색해 보세요."
        >
          <RegionSearch ready={kakao.state === "ready"} onPick={handlePickRegion} compact />
        </EmptyState>
      ) : null}

      {stations.data && stations.data.stations.length > 0 && geo.coordinates ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start lg:gap-8">
          {/* 모바일에서는 지도가 위에 붙어 있어야 카드를 눌렀을 때 바로 확인된다. */}
          <div className="sticky top-0 z-20 -mx-5 mb-6 bg-paper px-5 pt-1 pb-3 lg:order-2 lg:top-6 lg:mx-0 lg:mb-0 lg:px-0 lg:pt-0 lg:pb-0">
            <div className="h-[38vh] min-h-[240px] lg:h-[calc(100dvh-7rem)] lg:min-h-[480px]">
              {kakao.state === "ready" ? (
                <KakaoMap
                  origin={stations.data.origin}
                  originLabel={originLabel}
                  stations={stations.data.stations}
                  selectedId={selectedId}
                  onSelect={handleSelectFromMap}
                />
              ) : (
                <div className="flex size-full items-center justify-center rounded-[14px] border border-line bg-surface px-6 text-center">
                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    {kakao.state === "error"
                      ? kakao.missingKey
                        ? "지도를 표시할 수 없습니다. 카카오맵 앱키가 설정되지 않았습니다."
                        : "지도를 불러오지 못했습니다. 목록은 그대로 사용할 수 있습니다."
                      : "지도를 불러오는 중입니다…"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:order-1">
            <StationList
              stations={stations.data.stations}
              selectedId={selectedId}
              onSelect={handleSelectFromList}
              meta={stations.data.meta}
              originLabel={originLabel}
              refreshing={stations.status === "refreshing"}
              onRefresh={stations.refresh}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
