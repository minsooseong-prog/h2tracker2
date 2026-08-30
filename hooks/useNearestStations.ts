"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ERROR_MESSAGE } from "@/lib/errors";
import { NEAREST_COUNT } from "@/lib/config";
import type { ApiErrorBody, Coordinates, StationsResponse } from "@/types/station";

export type StationsStatus = "idle" | "loading" | "refreshing" | "success" | "error";

export interface NearestStationsResult {
  status: StationsStatus;
  data: StationsResponse | null;
  errorMessage: string | null;
  refresh: () => void;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { error?: { message?: unknown } };
  return typeof candidate.error?.message === "string";
}

/**
 * 서버 응답을 그대로 신뢰하지 않고 최소한의 형태만 확인한다.
 * 프록시나 배포 중 오류 페이지가 JSON 처럼 돌아오는 경우를 걸러낸다.
 */
function isStationsResponse(value: unknown): value is StationsResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { stations?: unknown; origin?: unknown; meta?: unknown };
  return (
    Array.isArray(candidate.stations) &&
    typeof candidate.origin === "object" &&
    candidate.origin !== null &&
    typeof candidate.meta === "object" &&
    candidate.meta !== null
  );
}

/**
 * 좌표가 정해지면 서버 라우트에서 가장 가까운 충전소를 받아온다.
 * 공공데이터 인증키는 서버에만 있으므로 이 훅은 절대 외부 API 를 직접 호출하지 않는다.
 */
export function useNearestStations(coordinates: Coordinates | null): NearestStationsResult {
  const [status, setStatus] = useState<StationsStatus>("idle");
  const [data, setData] = useState<StationsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const hasDataRef = useRef(false);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    if (!coordinates) {
      setStatus("idle");
      setData(null);
      setErrorMessage(null);
      hasDataRef.current = false;
      return;
    }

    // 좌표가 바뀌면 이전 요청은 필요 없다.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus(hasDataRef.current ? "refreshing" : "loading");
    setErrorMessage(null);

    const params = new URLSearchParams({
      lat: coordinates.lat.toFixed(6),
      lng: coordinates.lng.toFixed(6),
      limit: String(NEAREST_COUNT),
    });

    fetch(`/api/stations?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const message = isApiErrorBody(payload)
            ? payload.error.message
            : ERROR_MESSAGE.UPSTREAM_UNAVAILABLE;
          throw new Error(message);
        }

        if (!isStationsResponse(payload)) {
          throw new Error(ERROR_MESSAGE.UPSTREAM_PARSE);
        }

        setData(payload);
        hasDataRef.current = true;
        setStatus("success");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error && error.message ? error.message : ERROR_MESSAGE.UNKNOWN;
        // 네트워크 자체가 끊긴 경우 fetch 는 TypeError 를 던진다.
        setErrorMessage(
          error instanceof TypeError
            ? "네트워크에 연결할 수 없습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요."
            : message,
        );
        setStatus("error");
      });

    return () => controller.abort();
  }, [coordinates, refreshToken]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { status, data, errorMessage, refresh };
}
