"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao";
import type { LatLng } from "@/lib/geo";
import type { NearbyStation } from "@/types/station";

interface Props {
  origin: LatLng;
  stations: NearbyStation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onError: (message: string) => void;
}

function buildStationPin(station: NearbyStation): HTMLElement {
  const wrapper = document.createElement("button");
  wrapper.type = "button";
  wrapper.dataset["stationId"] = station.id;
  wrapper.setAttribute("aria-label", `${station.rank}순위 ${station.name}`);
  wrapper.style.cssText = [
    "display:flex", "align-items:center", "gap:6px", "padding:5px 11px 5px 5px",
    "border-radius:999px", "border:1px solid #E6E9E7", "background:#fff",
    "box-shadow:0 2px 10px rgba(16,22,19,.16)", "cursor:pointer",
    "font:600 12px/1 'Pretendard Variable',Pretendard,system-ui,sans-serif",
    "color:#101613", "white-space:nowrap", "transition:background .15s,border-color .15s",
  ].join(";");

  const badge = document.createElement("span");
  badge.textContent = String(station.rank);
  badge.style.cssText = [
    "display:inline-flex", "align-items:center", "justify-content:center",
    "width:20px", "height:20px", "border-radius:999px",
    "background:#F1F4F3", "color:#101613", "font-size:11px", "font-weight:700",
  ].join(";");

  const label = document.createElement("span");
  label.textContent = station.name;

  wrapper.append(badge, label);
  return wrapper;
}

function buildOriginPin(): HTMLElement {
  const dot = document.createElement("div");
  dot.setAttribute("aria-hidden", "true");
  dot.style.cssText = [
    "width:18px", "height:18px", "border-radius:999px", "background:#00795F",
    "border:3px solid #fff", "box-shadow:0 0 0 4px rgba(0,121,95,.18)",
  ].join(";");
  return dot;
}

export default function KakaoMap({ origin, stations, selectedId, onSelect, onError }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const pinsRef = useRef<Map<string, HTMLElement>>(new Map());
  const sdkRef = useRef<typeof kakao | null>(null);
  const [ready, setReady] = useState(false);

  // onSelect / onError 를 effect 의존성에서 빼기 위해 ref 로 고정
  const selectRef = useRef(onSelect);
  const errorRef = useRef(onError);
  useEffect(() => {
    selectRef.current = onSelect;
    errorRef.current = onError;
  });

  /* 1. SDK 로드 + 지도 생성 (마운트 시 1회) */
  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps()
      .then((sdk) => {
        if (cancelled || !containerRef.current) return;
        sdkRef.current = sdk;
        mapRef.current = new sdk.maps.Map(containerRef.current, {
          center: new sdk.maps.LatLng(origin.lat, origin.lng),
          level: 6,
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          errorRef.current("지도를 불러오지 못했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.");
        }
      });

    return () => {
      cancelled = true;
    };
    // origin 변경 시 지도를 다시 만들 필요는 없습니다 (아래 effect 에서 이동 처리).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 2. 마커 렌더링 */
  useEffect(() => {
    const sdk = sdkRef.current;
    const map = mapRef.current;
    if (!ready || !sdk || !map) return;

    for (const overlay of overlaysRef.current) overlay.setMap(null);
    overlaysRef.current = [];
    pinsRef.current = new Map();

    overlaysRef.current.push(
      new sdk.maps.CustomOverlay({
        position: new sdk.maps.LatLng(origin.lat, origin.lng),
        content: buildOriginPin(),
        map,
        zIndex: 1,
      }),
    );

    for (const station of stations) {
      const pin = buildStationPin(station);
      pin.addEventListener("click", () => selectRef.current(station.id));
      pinsRef.current.set(station.id, pin);

      overlaysRef.current.push(
        new sdk.maps.CustomOverlay({
          position: new sdk.maps.LatLng(station.lat, station.lng),
          content: pin,
          map,
          yAnchor: 1.25,
          zIndex: 10 - station.rank,
          clickable: true,
        }),
      );
    }

    if (stations.length > 0) {
      const bounds = new sdk.maps.LatLngBounds();
      bounds.extend(new sdk.maps.LatLng(origin.lat, origin.lng));
      for (const station of stations) bounds.extend(new sdk.maps.LatLng(station.lat, station.lng));
      map.setBounds(bounds, 64, 48, 64, 48);
    } else {
      map.setCenter(new sdk.maps.LatLng(origin.lat, origin.lng));
    }

    return () => {
      for (const overlay of overlaysRef.current) overlay.setMap(null);
      overlaysRef.current = [];
    };
  }, [ready, origin, stations]);

  /* 3. 선택 상태 반영 + 해당 마커로 이동 */
  useEffect(() => {
    const sdk = sdkRef.current;
    const map = mapRef.current;
    if (!ready || !sdk || !map) return;

    for (const [id, pin] of pinsRef.current) {
      const isActive = id === selectedId;
      pin.style.background = isActive ? "#00795F" : "#fff";
      pin.style.color = isActive ? "#fff" : "#101613";
      pin.style.borderColor = isActive ? "#00795F" : "#E6E9E7";
      const badge = pin.firstElementChild as HTMLElement | null;
      if (badge) {
        badge.style.background = isActive ? "rgba(255,255,255,.22)" : "#F1F4F3";
        badge.style.color = isActive ? "#fff" : "#101613";
      }
    }

    const target = stations.find((station) => station.id === selectedId);
    if (target) map.panTo(new sdk.maps.LatLng(target.lat, target.lng));
  }, [ready, selectedId, stations]);

  const recenter = useCallback(() => {
    const sdk = sdkRef.current;
    const map = mapRef.current;
    if (!sdk || !map) return;
    map.panTo(new sdk.maps.LatLng(origin.lat, origin.lng));
  }, [origin]);

  return (
    <div className="kakao-map-root relative h-full w-full overflow-hidden rounded-2xl border border-line bg-surface">
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="수소충전소 지도" />

      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-surface text-sm text-ink-muted">
          지도를 불러오는 중…
        </div>
      ) : null}

      <button
        type="button"
        onClick={recenter}
        aria-label="내 위치로 이동"
        className="absolute bottom-4 right-4 z-10 inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-white/95 px-4 text-sm font-medium text-ink shadow-card backdrop-blur transition-colors hover:bg-white"
      >
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
        내 위치
      </button>
    </div>
  );
}
