import type { Coordinates } from "@/types/station";

/** 지구 평균 반지름 (m) — WGS84 */
const EARTH_RADIUS_M = 6_371_008.8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Haversine 공식으로 두 좌표 사이의 대권(직선) 거리를 미터 단위로 계산한다.
 * 실제 주행거리가 아니라 직선거리라는 점을 UI 에서도 명시한다.
 */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 거리를 사람이 읽기 쉬운 형태로 바꾼다.
 *   950  -> "950m"
 *   2140 -> "2.1km"
 *   14200 -> "14km"
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "-";
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

/** 스크린리더용 거리 문구 */
export function describeDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "거리 정보 없음";
  if (meters < 1000) return `약 ${Math.round(meters / 10) * 10}미터`;
  return `약 ${(meters / 1000).toFixed(1)}킬로미터`;
}

/** 대한민국 육상/영해 대략 범위. 명백히 잘못된 좌표를 걸러낸다. */
export function isPlausibleKoreanCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 32 &&
    lat <= 39.7 &&
    lng >= 124 &&
    lng <= 132.5
  );
}
