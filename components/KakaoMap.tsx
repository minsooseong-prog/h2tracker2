"use client";

import { useCallback, useEffect, useRef } from "react";

import { formatDistance } from "@/lib/distance";
import type { Coordinates, NearbyStation } from "@/types/station";

interface KakaoMapProps {
  origin: Coordinates;
  originLabel: string;
  stations: NearbyStation[];
  selectedId: string | null;
  onSelect: (stationId: string) => void;
}

const SELECTED_CLASS =
  "flex items-center gap-1.5 rounded-full bg-[#0b7a6e] px-2.5 py-1.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(11,122,110,0.35)] cursor-pointer whitespace-nowrap";
const DEFAULT_CLASS =
  "flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#101513] shadow-[0_2px_10px_rgba(16,21,19,0.18)] ring-1 ring-[#d3dad8] cursor-pointer whitespace-nowrap";

function buildStationMarker(
  station: NearbyStation,
  onSelect: (id: string) => void,
): HTMLElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = DEFAULT_CLASS;
  element.setAttribute("aria-label", `${station.name}, 목록에서 보기`);
  element.innerHTML = `<span style="font-variant-numeric:tabular-nums">${station.rank}</span><span style="opacity:.5">·</span><span style="font-weight:500">${formatDistance(
    station.distanceMeters,
  )}</span>`;
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect(station.id);
  });
  return element;
}

function buildOriginMarker(label: string): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  element.style.cssText = "position:relative;width:18px;height:18px;";
  element.innerHTML = `
    <span style="position:absolute;inset:0;border-radius:9999px;background:#0b7a6e;opacity:.18"></span>
    <span style="position:absolute;inset:5px;border-radius:9999px;background:#0b7a6e;box-shadow:0 0 0 2px #fff"></span>
    <span class="sr-only">${label}</span>`;
  return element;
}

export function KakaoMap({ origin, originLabel, stations, selectedId, onSelect }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const stationOverlaysRef = useRef<Map<string, { overlay: kakao.maps.CustomOverlay; element: HTMLElement }>>(
    new Map(),
  );
  const originOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  /**
   * 새로고침으로 같은 충전소 목록이 다시 들어왔을 때 지도 범위를 리셋하면
   * 사용자가 보고 있던 위치가 튄다. 목록 구성이 실제로 바뀐 경우에만 다시 맞춘다.
   */
  const fitSignatureRef = useRef<string>("");

  /** 최신 onSelect 를 참조하되, 콜백이 바뀌었다고 마커를 다시 만들지는 않는다. */
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const fitToStations = useCallback(() => {
    const map = mapRef.current;
    if (!map || typeof window === "undefined" || !window.kakao?.maps) return;

    const bounds = new window.kakao.maps.LatLngBounds();
    bounds.extend(new window.kakao.maps.LatLng(origin.lat, origin.lng));
    for (const station of stations) {
      bounds.extend(new window.kakao.maps.LatLng(station.lat, station.lng));
    }
    if (!bounds.isEmpty()) {
      map.setBounds(bounds, 64, 40, 40, 40);
    }
  }, [origin.lat, origin.lng, stations]);

  /* 지도 생성 — 컨테이너당 한 번만 */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    if (typeof window === "undefined" || !window.kakao?.maps) return;

    mapRef.current = new window.kakao.maps.Map(container, {
      center: new window.kakao.maps.LatLng(origin.lat, origin.lng),
      level: 6,
    });

    return () => {
      // 카카오맵은 destroy API 가 없다. 오버레이를 떼고 컨테이너를 비워 누수를 막는다.
      for (const { overlay } of stationOverlaysRef.current.values()) overlay.setMap(null);
      stationOverlaysRef.current.clear();
      originOverlayRef.current?.setMap(null);
      originOverlayRef.current = null;
      mapRef.current = null;
      container.innerHTML = "";
    };
    // origin 은 최초 중심 좌표로만 쓰인다. 이후 이동은 아래 효과들이 담당한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 현재 위치 마커 */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof window === "undefined" || !window.kakao?.maps) return;

    const position = new window.kakao.maps.LatLng(origin.lat, origin.lng);
    if (originOverlayRef.current) {
      originOverlayRef.current.setPosition(position);
      return;
    }
    originOverlayRef.current = new window.kakao.maps.CustomOverlay({
      position,
      content: buildOriginMarker(originLabel),
      map,
      zIndex: 1,
      clickable: false,
    });
  }, [origin.lat, origin.lng, originLabel]);

  /* 충전소 마커 — 목록이 바뀔 때만 다시 만든다 */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof window === "undefined" || !window.kakao?.maps) return;

    for (const { overlay } of stationOverlaysRef.current.values()) overlay.setMap(null);
    stationOverlaysRef.current.clear();

    for (const station of stations) {
      const element = buildStationMarker(station, (id) => onSelectRef.current(id));
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(station.lat, station.lng),
        content: element,
        map,
        yAnchor: 1.35,
        zIndex: 10,
        clickable: true,
      });
      stationOverlaysRef.current.set(station.id, { overlay, element });
    }

    const signature = stations.map((station) => station.id).join("|");
    if (signature !== fitSignatureRef.current) {
      fitSignatureRef.current = signature;
      fitToStations();
    }
  }, [stations, fitToStations]);

  /* 선택 상태 반영 — 마커를 다시 만들지 않고 클래스만 바꾼다 */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof window === "undefined" || !window.kakao?.maps) return;

    for (const [id, { overlay, element }] of stationOverlaysRef.current.entries()) {
      const isSelected = id === selectedId;
      element.className = isSelected ? SELECTED_CLASS : DEFAULT_CLASS;
      overlay.setZIndex(isSelected ? 30 : 10);
    }

    if (!selectedId) return;
    const selected = stations.find((station) => station.id === selectedId);
    if (!selected) return;

    map.panTo(new window.kakao.maps.LatLng(selected.lat, selected.lng));
  }, [selectedId, stations]);

  /* 컨테이너 크기가 바뀌면(모바일 <-> 데스크톱 전환 등) 지도를 다시 계산한다 */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => mapRef.current?.relayout());
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map || typeof window === "undefined" || !window.kakao?.maps) return;
    map.setLevel(5);
    map.panTo(new window.kakao.maps.LatLng(origin.lat, origin.lng));
  }, [origin.lat, origin.lng]);

  return (
    <div className="relative size-full overflow-hidden rounded-[14px] border border-line bg-surface">
      <div ref={containerRef} className="kakao-map-container size-full" aria-hidden="true" />

      <div className="pointer-events-none absolute right-3 bottom-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="pointer-events-auto rounded-full border border-line bg-paper px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-sm transition-colors hover:bg-surface"
        >
          내 위치로
        </button>
        <button
          type="button"
          onClick={fitToStations}
          className="pointer-events-auto rounded-full border border-line bg-paper px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-sm transition-colors hover:bg-surface"
        >
          전체 보기
        </button>
      </div>

      <p className="sr-only">
        지도는 시각적 보조 수단입니다. 충전소의 모든 정보는 아래 목록에서 확인할 수 있습니다.
      </p>
    </div>
  );
}
