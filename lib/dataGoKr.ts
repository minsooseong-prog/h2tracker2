import "server-only";

import {
  DATA_GO_KR_KEY,
  H2_OPERATION_URL,
  H2_REALTIME_URL,
  OPERATION_CACHE_SECONDS,
  REALTIME_CACHE_SECONDS,
  UPSTREAM_PAGE_SIZE,
  UPSTREAM_TIMEOUT_MS,
} from "@/lib/config";
import { ApiError, detectUpstreamError, toApiError } from "@/lib/errors";
import {
  extractRows,
  normalizeOperationRow,
  normalizeRealtimeRow,
  stationNameKey,
  toStation,
  type OperationRecord,
  type RawRow,
} from "@/lib/normalize";
import type { Station, StationRealtime } from "@/types/station";

/* ------------------------------------------------------------------ *
 * 인증키 처리
 * ------------------------------------------------------------------ */

/**
 * 공공데이터포털은 Encoding 키와 Decoding 키를 함께 발급한다.
 * Encoding 키를 다시 인코딩하면 `%2B` 가 `%252B` 가 되어 인증이 실패한다.
 * 이미 퍼센트 인코딩된 문자열인지 판별해 한 번만 인코딩되도록 한다.
 */
export function buildServiceKeyParam(rawKey: string): string {
  const looksEncoded = /%[0-9A-Fa-f]{2}/.test(rawKey);
  return looksEncoded ? rawKey : encodeURIComponent(rawKey);
}

function assertKeyConfigured(): string {
  const key = DATA_GO_KR_KEY.trim();
  if (!key) {
    throw new ApiError("CONFIG_MISSING", 500, "DATA_GO_KR_KEY is not set");
  }
  return key;
}

/**
 * serviceKey 는 이미 인코딩된 형태일 수 있으므로 URLSearchParams 로 만들지 않고
 * 직접 조립한다. 나머지 파라미터만 인코딩한다.
 */
function buildUrl(baseUrl: string, extraParams: Record<string, string>): string {
  const serviceKey = buildServiceKeyParam(assertKeyConfigured());
  const separator = baseUrl.includes("?") ? "&" : "?";
  const rest = Object.entries(extraParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return `${baseUrl}${separator}serviceKey=${serviceKey}${rest ? `&${rest}` : ""}`;
}

/* ------------------------------------------------------------------ *
 * 업스트림 호출
 * ------------------------------------------------------------------ */

export interface UpstreamResult {
  rows: RawRow[];
  /** 진단용 — 첫 행의 실제 키 목록 */
  sampleKeys: string[];
  sampleRow: RawRow | null;
}

/**
 * Vercel 서버리스 함수는 요청 사이에 인스턴스가 재사용된다(warm start).
 * 모듈 스코프 캐시를 두면 같은 인스턴스로 들어온 연속 요청이
 * 공공데이터 API 를 다시 부르지 않는다. 일일 호출 한도를 아끼는 1차 방어선이다.
 * (Next 의 fetch 캐시는 라우트가 force-dynamic 일 때 우회될 수 있어 이중으로 둔다.)
 */
interface CacheEntry {
  value: UpstreamResult;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

function readCache(key: string): UpstreamResult | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

async function fetchUpstream(
  baseUrl: string,
  revalidateSeconds: number,
  extraParams: Record<string, string> = {},
): Promise<UpstreamResult> {
  const cacheKey = `${baseUrl}?${JSON.stringify(extraParams)}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const url = buildUrl(baseUrl, {
    pageNo: "1",
    numOfRows: String(UPSTREAM_PAGE_SIZE),
    dataType: "JSON",
    type: "json",
    returnType: "JSON",
    ...extraParams,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: revalidateSeconds },
    });
  } catch (error) {
    throw toApiError(error);
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.text();

  // HTTP 200 이어도 본문에 오류 코드가 담겨 오는 경우가 있다.
  const upstreamError = detectUpstreamError(body);
  if (upstreamError) throw upstreamError;

  if (!response.ok) {
    throw new ApiError("UPSTREAM_UNAVAILABLE", 502, `upstream status ${response.status}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new ApiError("UPSTREAM_PARSE", 502, "upstream did not return JSON");
  }

  const rows = extractRows(parsed);
  const firstRow = rows[0] ?? null;

  const result: UpstreamResult = {
    rows,
    sampleKeys: firstRow ? Object.keys(firstRow) : [],
    sampleRow: firstRow,
  };

  memoryCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + revalidateSeconds * 1000,
  });

  return result;
}

export const fetchOperationRaw = () => fetchUpstream(H2_OPERATION_URL, OPERATION_CACHE_SECONDS);
export const fetchRealtimeRaw = () => fetchUpstream(H2_REALTIME_URL, REALTIME_CACHE_SECONDS);

/* ------------------------------------------------------------------ *
 * 병합
 * ------------------------------------------------------------------ */

export interface StationDataset {
  stations: Station[];
  realtimeAvailable: boolean;
  realtimeMatched: number;
  fetchedAt: string;
}

/**
 * 운영정보(좌표/주소) + 실시간정보(운영상태/대기차량)를 하나로 합친다.
 *
 * - 운영정보는 필수다. 좌표가 없으면 거리 계산 자체가 불가능하므로 오류를 던진다.
 * - 실시간정보는 선택이다. 실패해도 위치 검색은 계속 동작하고,
 *   UI 가 "실시간 정보를 불러오지 못했습니다" 를 별도로 알린다.
 */
export async function loadStationDataset(): Promise<StationDataset> {
  const [operationSettled, realtimeSettled] = await Promise.allSettled([
    fetchOperationRaw(),
    fetchRealtimeRaw(),
  ]);

  if (operationSettled.status === "rejected") {
    throw toApiError(operationSettled.reason);
  }

  const operationRecords: OperationRecord[] = [];
  for (const row of operationSettled.value.rows) {
    const record = normalizeOperationRow(row);
    if (record) operationRecords.push(record);
  }

  if (operationRecords.length === 0) {
    throw new ApiError("UPSTREAM_PARSE", 502, "no usable station rows after normalization");
  }

  const realtimeById = new Map<string, StationRealtime>();
  const realtimeByName = new Map<string, StationRealtime>();
  let realtimeAvailable = false;

  if (realtimeSettled.status === "fulfilled") {
    realtimeAvailable = true;
    for (const row of realtimeSettled.value.rows) {
      const record = normalizeRealtimeRow(row);
      if (record.id) realtimeById.set(record.id, record.realtime);
      if (record.name) realtimeByName.set(stationNameKey(record.name), record.realtime);
    }
  }

  let realtimeMatched = 0;
  const stations = operationRecords.map((record) => {
    const realtime = realtimeById.get(record.id) ?? realtimeByName.get(stationNameKey(record.name)) ?? null;
    if (realtime) realtimeMatched += 1;
    return toStation(record, realtime);
  });

  return {
    stations,
    realtimeAvailable,
    realtimeMatched,
    fetchedAt: new Date().toISOString(),
  };
}
