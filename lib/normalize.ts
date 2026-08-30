import {
  ADDRESS_FIELDS,
  BUSINESS_HOURS_FIELDS,
  CHARGEABLE_FIELDS,
  CHARGER_AVAILABLE_FIELDS,
  CHARGER_IN_USE_FIELDS,
  CHARGER_TOTAL_FIELDS,
  CONGESTION_FIELDS,
  HOLIDAY_FIELDS,
  ID_FIELDS,
  LAT_FIELDS,
  LIST_CONTAINER_PATHS,
  LNG_FIELDS,
  NAME_FIELDS,
  OPERATION_STATUS_FIELDS,
  PHONE_FIELDS,
  PRESSURE_FIELDS,
  PRICE_FIELDS,
  UPDATED_AT_FIELDS,
  WAITING_FIELDS,
  type FieldCandidates,
} from "@/lib/fieldMap";
import { isPlausibleKoreanCoordinate } from "@/lib/distance";
import { resolveCongestion, resolveOperationStatus } from "@/lib/status";
import type { Station, StationRealtime } from "@/types/station";

export type RawRow = Record<string, unknown>;

/** 키 비교용 정규화: 대소문자와 언더스코어/공백을 무시한다. */
const canonicalKey = (key: string): string => key.toLowerCase().replace(/[_\s-]/g, "");

/** 행 하나에 대해 { 정규화된키 -> 원본키 } 인덱스를 만든다. */
function buildKeyIndex(row: RawRow): Map<string, string> {
  const index = new Map<string, string>();
  for (const key of Object.keys(row)) {
    const canonical = canonicalKey(key);
    if (!index.has(canonical)) index.set(canonical, key);
  }
  return index;
}

function readCandidate(row: RawRow, index: Map<string, string>, candidates: FieldCandidates): unknown {
  for (const candidate of candidates) {
    const actualKey = index.get(canonicalKey(candidate));
    if (actualKey === undefined) continue;
    const value = row[actualKey];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

export function pickString(
  row: RawRow,
  index: Map<string, string>,
  candidates: FieldCandidates,
): string | null {
  const value = readCandidate(row, index, candidates);
  if (value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

export function pickNumber(
  row: RawRow,
  index: Map<string, string>,
  candidates: FieldCandidates,
): number | null {
  const value = readCandidate(row, index, candidates);
  if (value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    // "12대", "1,234", "700 bar" 같은 표기도 안전하게 처리한다.
    const cleaned = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (!cleaned) return null;
    const parsed = Number(cleaned[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** 0 이상의 정수만 허용 (대수/개수 필드용) */
function pickCount(row: RawRow, index: Map<string, string>, candidates: FieldCandidates): number | null {
  const value = pickNumber(row, index, candidates);
  if (value === null) return null;
  if (value < 0) return null;
  return Math.round(value);
}

/**
 * 어떤 형태로 감싸여 있든 목록 배열을 찾아낸다.
 * 단일 객체가 오는 경우(item 이 배열이 아닌 경우)도 배열로 승격한다.
 */
export function extractRows(payload: unknown): RawRow[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);

  if (!isRecord(payload)) return [];

  for (const path of LIST_CONTAINER_PATHS) {
    let cursor: unknown = payload;
    let ok = true;
    for (const segment of path) {
      if (!isRecord(cursor) || !(segment in cursor)) {
        ok = false;
        break;
      }
      cursor = cursor[segment];
    }
    if (!ok || cursor === undefined || cursor === null) continue;
    if (Array.isArray(cursor)) return cursor.filter(isRecord);
    if (isRecord(cursor)) return [cursor];
  }

  // 마지막 수단: 최상위 값 중 객체 배열이 하나뿐이면 그것을 목록으로 본다.
  const arrays = Object.values(payload).filter(
    (value): value is RawRow[] => Array.isArray(value) && value.every(isRecord),
  );
  if (arrays.length === 1 && arrays[0]) return arrays[0];

  return [];
}

export function isRecord(value: unknown): value is RawRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 좌표는 문자열로 오는 경우가 많고, 위/경도가 뒤바뀐 데이터도 방어한다. */
function normalizeCoordinates(
  latRaw: number | null,
  lngRaw: number | null,
): { lat: number; lng: number } | null {
  if (latRaw === null || lngRaw === null) return null;
  if (isPlausibleKoreanCoordinate(latRaw, lngRaw)) return { lat: latRaw, lng: lngRaw };
  if (isPlausibleKoreanCoordinate(lngRaw, latRaw)) return { lat: lngRaw, lng: latRaw };
  return null;
}

export interface OperationRecord {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  businessHours: string | null;
  holiday: string | null;
}

/** 운영정보(기본정보) 한 행 -> 충전소 마스터 레코드. 좌표가 없으면 버린다. */
export function normalizeOperationRow(row: RawRow): OperationRecord | null {
  const index = buildKeyIndex(row);

  const name = pickString(row, index, NAME_FIELDS);
  if (!name) return null;

  const coordinates = normalizeCoordinates(
    pickNumber(row, index, LAT_FIELDS),
    pickNumber(row, index, LNG_FIELDS),
  );
  if (!coordinates) return null;

  const id = pickString(row, index, ID_FIELDS) ?? `${name}@${coordinates.lat},${coordinates.lng}`;

  return {
    id,
    name,
    address: pickString(row, index, ADDRESS_FIELDS),
    lat: coordinates.lat,
    lng: coordinates.lng,
    phone: pickString(row, index, PHONE_FIELDS),
    businessHours: pickString(row, index, BUSINESS_HOURS_FIELDS),
    holiday: pickString(row, index, HOLIDAY_FIELDS),
  };
}

export interface RealtimeRecord {
  id: string | null;
  name: string | null;
  realtime: StationRealtime;
}

/** 실시간정보 한 행 -> 실시간 상태. 값이 없으면 null 로 남긴다. */
export function normalizeRealtimeRow(row: RawRow): RealtimeRecord {
  const index = buildKeyIndex(row);

  const operationStatusLabel = pickString(row, index, OPERATION_STATUS_FIELDS);
  const congestionLabel = pickString(row, index, CONGESTION_FIELDS);
  const waitingVehicles = pickCount(row, index, WAITING_FIELDS);

  const { level: congestion, source: congestionSource } = resolveCongestion(
    congestionLabel,
    waitingVehicles,
  );

  return {
    id: pickString(row, index, ID_FIELDS),
    name: pickString(row, index, NAME_FIELDS),
    realtime: {
      operationStatus: resolveOperationStatus(operationStatusLabel),
      operationStatusLabel,
      congestion,
      congestionLabel,
      congestionSource,
      waitingVehicles,
      chargeableVehicles: pickCount(row, index, CHARGEABLE_FIELDS),
      chargerTotal: pickCount(row, index, CHARGER_TOTAL_FIELDS),
      chargerAvailable: pickCount(row, index, CHARGER_AVAILABLE_FIELDS),
      chargerInUse: pickCount(row, index, CHARGER_IN_USE_FIELDS),
      tubeTrailerPressure: pickNumber(row, index, PRESSURE_FIELDS),
      pricePerKg: pickNumber(row, index, PRICE_FIELDS),
      updatedAt: pickString(row, index, UPDATED_AT_FIELDS),
    },
  };
}

/** 충전소명 기반 매칭용 키 (관리번호가 서로 다를 때의 2차 매칭 수단) */
export function stationNameKey(name: string): string {
  return name.replace(/\s+/g, "").replace(/\(.*?\)/g, "").toLowerCase();
}

export function toStation(record: OperationRecord, realtime: StationRealtime | null): Station {
  return { ...record, realtime };
}
