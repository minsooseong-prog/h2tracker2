import { REALTIME_FIELDS, STATION_FIELDS, indexRecord, pickNumber, pickString } from "@/lib/fields";
import { isInKorea } from "@/lib/geo";
import type { RawRecord, RealtimeInfo, StationBase } from "@/types/station";

/**
 * 공공데이터포털은 데이터셋마다 응답 봉투가 다릅니다.
 * 아래 4가지 형태를 모두 받아 레코드 배열로 펼칩니다.
 *  - odcloud     : { currentCount, data: [...] }
 *  - 표준 기관 API : { response: { header, body: { items: [...] | { item: [...] } } } }
 *  - 축약형       : { items: [...] }
 *  - 순수 배열     : [...]
 */
export function extractRecords(payload: unknown): RawRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];

  const direct = payload["data"] ?? payload["items"] ?? payload["item"];
  if (Array.isArray(direct)) return direct.filter(isRecord);

  const response = payload["response"];
  if (isRecord(response)) {
    const body = response["body"];
    if (isRecord(body)) {
      const items = body["items"];
      if (Array.isArray(items)) return items.filter(isRecord);
      if (isRecord(items) && Array.isArray(items["item"])) {
        return items["item"].filter(isRecord);
      }
      if (isRecord(items)) return [items];
    }
  }
  return [];
}

/** 표준 기관 API가 200 응답 안에 에러를 담아 보내는 경우를 잡아냅니다. */
export function extractUpstreamError(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  const response = payload["response"];
  if (isRecord(response)) {
    const header = response["header"];
    if (isRecord(header)) {
      const code = String(header["resultCode"] ?? "");
      if (code !== "" && code !== "00" && code !== "0") {
        return `${code} ${String(header["resultMsg"] ?? "")}`.trim();
      }
    }
  }

  const cmm = payload["cmmMsgHeader"];
  if (isRecord(cmm)) {
    const msg = cmm["returnAuthMsg"] ?? cmm["errMsg"];
    if (msg) return String(msg);
  }
  return null;
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 현황 레코드 → StationBase. 좌표나 이름이 없으면 null (버립니다) */
export function toStationBase(record: RawRecord): StationBase | null {
  const index = indexRecord(record);

  const lat = pickNumber(index, STATION_FIELDS.lat);
  const lng = pickNumber(index, STATION_FIELDS.lng);
  const name = pickString(index, STATION_FIELDS.name);
  if (lat === null || lng === null || name === null) return null;

  // 위경도가 뒤집혀 들어오는 데이터셋 방어
  const coords = isInKorea({ lat, lng })
    ? { lat, lng }
    : isInKorea({ lat: lng, lng: lat })
      ? { lat: lng, lng: lat }
      : null;
  if (!coords) return null;

  const id = pickString(index, STATION_FIELDS.id) ?? `${name}@${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
  const hours = pickString(index, STATION_FIELDS.hours);
  const rest = pickString(index, STATION_FIELDS.restInfo);

  return {
    id,
    name,
    address: pickString(index, STATION_FIELDS.address),
    lat: coords.lat,
    lng: coords.lng,
    phone: pickString(index, STATION_FIELDS.phone),
    businessHours: [hours, rest ? `휴무 ${rest}` : null].filter(Boolean).join(" · ") || null,
    vehicleTypes: pickString(index, STATION_FIELDS.vehicleTypes),
  };
}

/** 실시간/운영 레코드 → RealtimeInfo (+ 어떤 충전소 것인지 알려주는 id) */
export function toRealtime(record: RawRecord): {
  id: string | null;
  name: string | null;
  info: RealtimeInfo;
} {
  const index = indexRecord(record);
  return {
    id: pickString(index, REALTIME_FIELDS.id),
    name: pickString(index, STATION_FIELDS.name),
    info: {
      updatedAt: pickString(index, REALTIME_FIELDS.updatedAt),
      operationStatus: pickString(index, REALTIME_FIELDS.operationStatus),
      congestionLabel: pickString(index, REALTIME_FIELDS.congestionLabel),
      waitingVehicles: pickNumber(index, REALTIME_FIELDS.waitingVehicles),
      chargeableVehicles: pickNumber(index, REALTIME_FIELDS.chargeableVehicles),
      tubeTrailerPressure: pickNumber(index, REALTIME_FIELDS.tubeTrailerPressure),
      dispenserTotal: pickNumber(index, REALTIME_FIELDS.dispenserTotal),
      dispenserAvailable: pickNumber(index, REALTIME_FIELDS.dispenserAvailable),
      dispenserInUse: pickNumber(index, REALTIME_FIELDS.dispenserInUse),
      pricePerKg: pickNumber(index, REALTIME_FIELDS.pricePerKg),
      notice: pickString(index, REALTIME_FIELDS.notice),
    },
  };
}

/** 같은 충전소에 대한 실시간/운영 두 소스를 합칩니다. 앞쪽 값이 우선. */
export function mergeRealtime(primary: RealtimeInfo, secondary: RealtimeInfo): RealtimeInfo {
  return {
    updatedAt: primary.updatedAt ?? secondary.updatedAt,
    operationStatus: primary.operationStatus ?? secondary.operationStatus,
    congestionLabel: primary.congestionLabel ?? secondary.congestionLabel,
    waitingVehicles: primary.waitingVehicles ?? secondary.waitingVehicles,
    chargeableVehicles: primary.chargeableVehicles ?? secondary.chargeableVehicles,
    tubeTrailerPressure: primary.tubeTrailerPressure ?? secondary.tubeTrailerPressure,
    dispenserTotal: primary.dispenserTotal ?? secondary.dispenserTotal,
    dispenserAvailable: primary.dispenserAvailable ?? secondary.dispenserAvailable,
    dispenserInUse: primary.dispenserInUse ?? secondary.dispenserInUse,
    pricePerKg: primary.pricePerKg ?? secondary.pricePerKg,
    notice: primary.notice ?? secondary.notice,
  };
}

/** 이름 기반 join 폴백용 정규화 (관리번호가 서로 다른 체계일 때) */
export function nameKey(name: string): string {
  return name.replace(/\s/g, "").replace(/충전소$/, "").toLowerCase();
}
