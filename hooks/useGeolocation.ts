"use client";

import { useCallback, useRef, useState } from "react";

import type { Coordinates } from "@/types/station";

export type GeolocationState = "idle" | "locating" | "granted" | "denied" | "unavailable";

export interface GeolocationResult {
  state: GeolocationState;
  coordinates: Coordinates | null;
  message: string | null;
  request: () => void;
  /** 지역 검색 등으로 좌표를 직접 지정할 때 사용 */
  setManualCoordinates: (coordinates: Coordinates, label?: string) => void;
  /** 사용자가 고른 지역 이름. 현재 위치일 때는 null */
  manualLabel: string | null;
  reset: () => void;
}

const DENIED_MESSAGE =
  "현재 위치를 확인할 수 없습니다. 브라우저 주소창의 위치 아이콘에서 권한을 허용하거나, 아래에서 지역을 검색해 주세요.";
const UNAVAILABLE_MESSAGE =
  "이 브라우저에서는 위치 기능을 사용할 수 없습니다. 아래에서 지역을 검색해 주세요.";
const TIMEOUT_MESSAGE =
  "위치를 확인하는 데 시간이 너무 오래 걸립니다. 다시 시도하거나 지역을 검색해 주세요.";

export function useGeolocation(): GeolocationResult {
  const [state, setState] = useState<GeolocationState>("idle");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [manualLabel, setManualLabel] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /** 응답이 늦게 도착한 이전 요청이 최신 상태를 덮어쓰지 않도록 한다. */
  const requestIdRef = useRef(0);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState("unavailable");
      setMessage(UNAVAILABLE_MESSAGE);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState("locating");
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestIdRef.current !== requestId) return;
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setManualLabel(null);
        setState("granted");
        setMessage(null);
      },
      (error) => {
        if (requestIdRef.current !== requestId) return;
        if (error.code === error.PERMISSION_DENIED) {
          setState("denied");
          setMessage(DENIED_MESSAGE);
          return;
        }
        if (error.code === error.TIMEOUT) {
          setState("denied");
          setMessage(TIMEOUT_MESSAGE);
          return;
        }
        setState("unavailable");
        setMessage(UNAVAILABLE_MESSAGE);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const setManualCoordinates = useCallback((next: Coordinates, label?: string) => {
    requestIdRef.current += 1; // 진행 중인 위치 요청 결과를 무시한다.
    setCoordinates(next);
    setManualLabel(label ?? null);
    setState("granted");
    setMessage(null);
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setState("idle");
    setCoordinates(null);
    setManualLabel(null);
    setMessage(null);
  }, []);

  return { state, coordinates, message, request, setManualCoordinates, manualLabel, reset };
}
